import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SALT = "ma-las-salt:";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AuthUser {
  user_id: string;
  user_type: "admin" | "siswa";
  username: string;
  nama: string;
  siswa_id?: string;
}

async function getSessionUser(token: string): Promise<AuthUser | null> {
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, user_type, username, nama, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from("sessions").delete().eq("token", token);
    return null;
  }

  const user: AuthUser = {
    user_id: session.user_id,
    user_type: session.user_type as "admin" | "siswa",
    username: session.username,
    nama: session.nama,
  };

  if (user.user_type === "siswa") {
    const { data: siswa } = await supabase
      .from("siswa")
      .select("id")
      .eq("id", session.user_id)
      .maybeSingle();
    if (siswa) user.siswa_id = siswa.id;
  }

  return user;
}

async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  return await getSessionUser(token);
}

function requireAdmin(user: AuthUser | null): AuthUser | null {
  if (!user || user.user_type !== "admin") return null;
  return user;
}

function parsePath(req: Request): string[] {
  const url = new URL(req.url);
  let path = url.pathname;
  // Strip common prefixes the Supabase runtime may include
  const prefixes = ["/functions/v1/api", "/functions/v1", "/api"];
  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length);
      break;
    }
  }
  return path.split("/").filter(Boolean);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const segments = parsePath(req);
    const [action, ...rest] = segments;

    // ============================================================
    // AUTH: login
    // ============================================================
    if (action === "login" && req.method === "POST") {
      const { username, password } = await req.json();
      if (!username || !password) {
        return jsonResponse({ error: "Username dan password wajib diisi" }, 400);
      }

      const hashedPassword = await sha256(SALT + password);

      // Try admin account first
      const { data: admin } = await supabase
        .from("akun")
        .select("id, username, nama, role, password_hash")
        .eq("username", username)
        .maybeSingle();

      if (admin && admin.password_hash === hashedPassword) {
        const token = crypto.randomUUID() + crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("sessions").insert({
          token,
          user_id: admin.id,
          user_type: "admin",
          username: admin.username,
          nama: admin.nama,
          expires_at: expiresAt,
        });
        return jsonResponse({
          token,
          user_type: "admin",
          username: admin.username,
          nama: admin.nama,
          user_id: admin.id,
        });
      }

      // Try siswa account (username = NISN)
      // Validation: password_1 first (siswa), then password_2 (ortu)
      const { data: siswa } = await supabase
        .from("siswa")
        .select("id, nisn, nama, password_hash, password_1, password_2, kelas_id")
        .eq("nisn", username)
        .maybeSingle();

      if (siswa) {
        // Step 1: validate as SISWA using password_1 (fallback to password_hash for legacy)
        const siswaHash = siswa.password_1 || siswa.password_hash || "";
        if (siswaHash && siswaHash === hashedPassword) {
          const token = crypto.randomUUID() + crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabase.from("sessions").insert({
            token,
            user_id: siswa.id,
            user_type: "siswa",
            username: siswa.nisn,
            nama: siswa.nama,
            expires_at: expiresAt,
          });
          return jsonResponse({
            token,
            user_type: "siswa",
            username: siswa.nisn,
            nama: siswa.nama,
            user_id: siswa.id,
            siswa_id: siswa.id,
            kelas_id: siswa.kelas_id,
          });
        }

        // Step 2: validate as ORANG TUA using password_2
        if (siswa.password_2 && siswa.password_2 === hashedPassword) {
          const token = crypto.randomUUID() + crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabase.from("sessions").insert({
            token,
            user_id: siswa.id,
            user_type: "ortu",
            username: siswa.nisn,
            nama: `${siswa.nama} (Orang Tua)`,
            expires_at: expiresAt,
          });
          return jsonResponse({
            token,
            user_type: "ortu",
            username: siswa.nisn,
            nama: `${siswa.nama} (Orang Tua)`,
            user_id: siswa.id,
            siswa_id: siswa.id,
            kelas_id: siswa.kelas_id,
          });
        }
      }

      return jsonResponse({ error: "Username atau password salah" }, 401);
    }

    // ============================================================
    // AUTH: verify session
    // ============================================================
    if (action === "verify" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Sesi tidak valid" }, 401);
      return jsonResponse({ user });
    }

    // ============================================================
    // AUTH: logout
    // ============================================================
    if (action === "logout" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        await supabase.from("sessions").delete().eq("token", token);
      }
      return jsonResponse({ success: true });
    }

    // ============================================================
    // AUTH: change password
    // ============================================================
    if (action === "change-password" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      const { oldPassword, newPassword } = await req.json();
      if (!oldPassword || !newPassword) {
        return jsonResponse({ error: "Password lama dan baru wajib diisi" }, 400);
      }
      if (newPassword.length < 4) {
        return jsonResponse({ error: "Password baru minimal 4 karakter" }, 400);
      }

      const oldHash = await sha256(SALT + oldPassword);
      const newHash = await sha256(SALT + newPassword);

      if (user.user_type === "siswa" || user.user_type === "ortu") {
        const col = user.user_type === "siswa" ? "password_1" : "password_2";
        const { data: siswa } = await supabase
          .from("siswa")
          .select(`${col}, password_hash`)
          .eq("id", user.user_id)
          .maybeSingle();
        const currentHash = (siswa && (siswa[col] || siswa.password_hash)) || "";
        if (!siswa || currentHash !== oldHash) {
          return jsonResponse({ error: "Password lama salah" }, 400);
        }
        const update: Record<string, string> = { [col]: newHash, updated_at: new Date().toISOString() };
        if (user.user_type === "siswa") update.password_hash = newHash;
        const { error } = await supabase
          .from("siswa")
          .update(update)
          .eq("id", user.user_id);
        if (error) return jsonResponse({ error: "Gagal mengubah password" }, 500);
      } else {
        const { data: admin } = await supabase
          .from("akun")
          .select("password_hash")
          .eq("id", user.user_id)
          .maybeSingle();
        if (!admin || admin.password_hash !== oldHash) {
          return jsonResponse({ error: "Password lama salah" }, 400);
        }
        const { error } = await supabase
          .from("akun")
          .update({ password_hash: newHash, updated_at: new Date().toISOString() })
          .eq("id", user.user_id);
        if (error) return jsonResponse({ error: "Gagal mengubah password" }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ============================================================
    // AUTH: admin force reset for siswa
    // ============================================================
    if (action === "reset-siswa-password" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!requireAdmin(user)) return jsonResponse({ error: "Akses ditolak" }, 403);

      const { siswaId, newNisn } = await req.json();
      if (!siswaId || !newNisn) {
        return jsonResponse({ error: "Siswa dan NISN baru wajib diisi" }, 400);
      }
      const newHash = await sha256(SALT + newNisn);
      const { error } = await supabase
        .from("siswa")
        .update({ password_1: newHash, password_hash: newHash, updated_at: new Date().toISOString() })
        .eq("id", siswaId);
      if (error) return jsonResponse({ error: "Gagal reset password" }, 500);
      return jsonResponse({ success: true });
    }

    // ============================================================
    // AUTH: admin set ortu password (password_2) for siswa
    // ============================================================
    if (action === "set-siswa-ortu-password" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!requireAdmin(user)) return jsonResponse({ error: "Akses ditolak" }, 403);

      const { siswaId, password } = await req.json();
      if (!siswaId) return jsonResponse({ error: "Siswa wajib diisi" }, 400);
      if (!password || !password.trim()) return jsonResponse({ error: "Password wajib diisi" }, 400);

      const newHash = await sha256(SALT + password.trim());
      const { error } = await supabase
        .from("siswa")
        .update({ password_2: newHash, updated_at: new Date().toISOString() })
        .eq("id", siswaId);
      if (error) return jsonResponse({ error: "Gagal menyimpan password orang tua" }, 500);
      return jsonResponse({ success: true });
    }

    // ============================================================
    // SISWA: bulk import from Excel/CSV
    // ============================================================
    if (action === "siswa-bulk" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!requireAdmin(user)) return jsonResponse({ error: "Akses ditolak" }, 403);

      const { siswaList, kelasMap } = await req.json();
      if (!Array.isArray(siswaList) || siswaList.length === 0) {
        return jsonResponse({ error: "Data siswa kosong" }, 400);
      }
      if (!kelasMap || typeof kelasMap !== "object") {
        return jsonResponse({ error: "Peta kelas tidak valid" }, 400);
      }

      // Fetch existing NISNs to detect duplicates
      const allNisns = siswaList.map((s: { nisn: string }) => s.nisn).filter(Boolean);
      const { data: existing } = await supabase
        .from("siswa")
        .select("id, nisn")
        .in("nisn", allNisns);
      const existingMap = new Map((existing || []).map((s: { id: string; nisn: string }) => [s.nisn, s.id]));

      const toInsert: Record<string, unknown>[] = [];
      const toUpdate: { id: string; body: Record<string, unknown> }[] = [];
      const errors: { row: number; nisn: string; message: string }[] = [];
      let rowIdx = 1;

      for (const s of siswaList) {
        rowIdx++;
        const nisn = String(s.nisn || "").trim();
        const nama = String(s.nama || "").trim();
        if (!nisn || !nama) {
          errors.push({ row: rowIdx, nisn: nisn || "-", message: "NISN dan nama wajib diisi" });
          continue;
        }
        const kelasNama = String(s.kelas || "").trim();
        const kelasId = kelasNama ? (kelasMap[kelasNama] || null) : null;
        if (kelasNama && !kelasId) {
          errors.push({ row: rowIdx, nisn, message: `Kelas "${kelasNama}" tidak ditemukan` });
          continue;
        }
        const body: Record<string, unknown> = {
          nisn,
          nama,
          kelas_id: kelasId,
          jenis_kelamin: String(s.jenis_kelamin || "").trim().toUpperCase() === "P" ? "P" : String(s.jenis_kelamin || "").trim().toUpperCase() === "L" ? "L" : "",
          tempat_lahir: String(s.tempat_lahir || "").trim(),
          tanggal_lahir: s.tanggal_lahir ? String(s.tanggal_lahir).trim() : null,
          alamat: String(s.alamat || "").trim(),
          nama_ortu: String(s.nama_ortu || "").trim(),
          no_hp_ortu: String(s.no_hp_ortu || "").trim(),
        };

        const existingId = existingMap.get(nisn);
        if (existingId) {
          const updateBody: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };
          if (s.password_1 && String(s.password_1).trim()) {
            updateBody.password_1 = await sha256(SALT + String(s.password_1).trim());
            updateBody.password_hash = updateBody.password_1;
          }
          if (s.password_2 && String(s.password_2).trim()) {
            updateBody.password_2 = await sha256(SALT + String(s.password_2).trim());
          }
          toUpdate.push({ id: existingId, body: updateBody });
        } else {
          const hash = await sha256(SALT + nisn);
          body.password_1 = (s.password_1 && String(s.password_1).trim()) ? await sha256(SALT + String(s.password_1).trim()) : hash;
          body.password_hash = body.password_1;
          if (s.password_2 && String(s.password_2).trim()) {
            body.password_2 = await sha256(SALT + String(s.password_2).trim());
          }
          toInsert.push(body);
        }
      }

      let insertedCount = 0;
      let updatedCount = 0;
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("siswa").insert(toInsert);
        if (insErr) return jsonResponse({ error: insErr.message }, 500);
        insertedCount = toInsert.length;
      }
      for (const u of toUpdate) {
        const { error: updErr } = await supabase.from("siswa").update(u.body).eq("id", u.id);
        if (updErr) {
          errors.push({ row: 0, nisn: "", message: updErr.message });
        } else {
          updatedCount++;
        }
      }

      return jsonResponse({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        errors,
        total: siswaList.length,
      });
    }

    // ============================================================
    // PUBLIC: list tahun ajaran (for login page — no auth required)
    // ============================================================
    if (action === "tahun-ajaran-public" && req.method === "GET") {
      const { data, error } = await supabase
        .from("tahun_ajaran")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ data, total: data.length, page: 1, perPage: 1000 });
    }

    // ============================================================
    // ABSENSI: batch save (bulk create/update for a class on a date)
    // ============================================================
    if (action === "absensi-batch" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!requireAdmin(user)) return jsonResponse({ error: "Akses ditolak" }, 403);

      const { kelas_id, tanggal, materi_ajar, entries, tahun_ajaran_id, semester } = await req.json();
      if (!kelas_id || !tanggal || !Array.isArray(entries)) {
        return jsonResponse({ error: "kelas_id, tanggal, dan entries wajib diisi" }, 400);
      }

      // Fetch existing absensi records for this class+date
      const { data: existing } = await supabase
        .from("absensi")
        .select("id, siswa_id")
        .eq("kelas_id", kelas_id)
        .eq("tanggal", tanggal);

      const existingMap = new Map((existing || []).map((a) => [a.siswa_id, a.id]));

      const toInsert: Record<string, unknown>[] = [];
      const toUpdate: { id: string; body: Record<string, unknown> }[] = [];

      for (const entry of entries) {
        if (!entry.siswa_id) continue;
        const body: Record<string, unknown> = {
          siswa_id: entry.siswa_id,
          kelas_id,
          tanggal,
          status: entry.status || "Hadir",
          keterangan: entry.keterangan || "",
          materi_ajar: materi_ajar || "",
          tahun_ajaran_id: tahun_ajaran_id || null,
          semester: semester || "",
          updated_at: new Date().toISOString(),
        };
        const existingId = existingMap.get(entry.siswa_id);
        if (existingId) {
          toUpdate.push({ id: existingId, body });
        } else {
          toInsert.push(body);
        }
      }

      let savedCount = 0;
      if (toInsert.length > 0) {
        const { error } = await supabase.from("absensi").insert(toInsert);
        if (error) return jsonResponse({ error: error.message }, 500);
        savedCount += toInsert.length;
      }
      for (const u of toUpdate) {
        const { error } = await supabase.from("absensi").update(u.body).eq("id", u.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        savedCount++;
      }

      return jsonResponse({ success: true, saved: savedCount });
    }

    // ============================================================
    // ABSENSI: get batch for a class+date (for pre-populating the form)
    // ============================================================
    if (action === "absensi-batch" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      const url = new URL(req.url);
      const kelas_id = url.searchParams.get("kelas_id");
      const tanggal = url.searchParams.get("tanggal");
      if (!kelas_id || !tanggal) {
        return jsonResponse({ error: "kelas_id dan tanggal wajib diisi" }, 400);
      }

      const { data, error } = await supabase
        .from("absensi")
        .select("id, siswa_id, status, keterangan, materi_ajar")
        .eq("kelas_id", kelas_id)
        .eq("tanggal", tanggal);

      if (error) return jsonResponse({ error: error.message }, 500);

      const materi_ajar = (data && data.length > 0) ? (data[0].materi_ajar || "") : "";
      const entries = (data || []).map((a) => ({
        siswa_id: a.siswa_id,
        status: a.status,
        keterangan: a.keterangan || "",
        existing_id: a.id,
      }));

      return jsonResponse({ entries, materi_ajar });
    }

    // ============================================================
    // MATERI: download file
    // ============================================================
    if (action === "materi-download" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      const materiId = rest[0];
      if (!materiId) return jsonResponse({ error: "ID materi wajib diisi" }, 400);

      const { data: materi, error: matErr } = await supabase
        .from("materi")
        .select("file_path, file_name, file_type")
        .eq("id", materiId)
        .maybeSingle();
      if (matErr || !materi) return jsonResponse({ error: "Materi tidak ditemukan" }, 404);

      const { data: fileData, error: fileErr } = await supabase.storage
        .from("materi-files")
        .download(materi.file_path);

      if (fileErr || !fileData) return jsonResponse({ error: "Gagal mengunduh file" }, 500);

      return new Response(fileData, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": materi.file_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${materi.file_name}"`,
        },
      });
    }

    // ============================================================
    // MATERI: upload file (multipart form-data)
    // ============================================================
    if (action === "materi-upload" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!requireAdmin(user)) return jsonResponse({ error: "Akses ditolak" }, 403);

      const formData = await req.formData();
      const file = formData.get("file");
      const mata_pelajaran_id = formData.get("mata_pelajaran_id")?.toString() || "";
      const judul = formData.get("judul")?.toString() || "";
      const tingkat = formData.get("tingkat")?.toString() || "";

      if (!file || !(file instanceof File)) {
        return jsonResponse({ error: "File wajib diupload" }, 400);
      }
      if (!judul.trim()) {
        return jsonResponse({ error: "Judul wajib diisi" }, 400);
      }

      const allowedTypes = [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      const allowedExtensions = [".ppt", ".pptx", ".pdf", ".doc", ".docx"];
      const fileName = file.name;
      const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        return jsonResponse({ error: "Format file tidak didukung. Gunakan PPT, PPTX, PDF, DOC, atau DOCX." }, 400);
      }

      if (file.size > 50 * 1024 * 1024) {
        return jsonResponse({ error: "Ukuran file maksimal 50MB" }, 400);
      }

      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("materi-files")
        .upload(filePath, file, { contentType: file.type || "application/octet-stream" });

      if (uploadErr) return jsonResponse({ error: uploadErr.message }, 500);

      const { data, error: dbErr } = await supabase
        .from("materi")
        .insert({
          mata_pelajaran_id: mata_pelajaran_id || null,
          judul,
          tingkat: tingkat || "",
          file_path: filePath,
          file_name: fileName,
          file_size: file.size,
          file_type: file.type || ext,
          uploaded_by: user.nama,
        })
        .select("*, mata_pelajaran:mata_pelajaran_id(nama)")
        .single();

      if (dbErr) {
        await supabase.storage.from("materi-files").remove([filePath]);
        return jsonResponse({ error: dbErr.message }, 500);
      }

      return jsonResponse({ data });
    }

    // ============================================================
    // PENUGASAN: download PDF file
    // ============================================================
    if (action === "penugasan-download" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      const penugasanId = rest[0];
      if (!penugasanId) return jsonResponse({ error: "ID penugasan wajib diisi" }, 400);

      const { data: pen, error: penErr } = await supabase
        .from("penugasan")
        .select("file_path, file_name, file_type")
        .eq("id", penugasanId)
        .maybeSingle();
      if (penErr || !pen) return jsonResponse({ error: "Penugasan tidak ditemukan" }, 404);

      const { data: fileData, error: fileErr } = await supabase.storage
        .from("penugasan-files")
        .download(pen.file_path);

      if (fileErr || !fileData) return jsonResponse({ error: "Gagal mengunduh file" }, 500);

      return new Response(fileData, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": pen.file_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${pen.file_name}"`,
        },
      });
    }

    // ============================================================
    // PENUGASAN: upload PDF file (multipart form-data)
    // ============================================================
    if (action === "penugasan-upload" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!requireAdmin(user)) return jsonResponse({ error: "Akses ditolak" }, 403);

      const formData = await req.formData();
      const file = formData.get("file");
      const judul = formData.get("judul")?.toString() || "";
      const deskripsi = formData.get("deskripsi")?.toString() || "";
      const kelas_id = formData.get("kelas_id")?.toString() || "";
      const mata_pelajaran_id = formData.get("mata_pelajaran_id")?.toString() || "";
      const deadline = formData.get("deadline")?.toString() || "";
      const tahun_ajaran_id = formData.get("tahun_ajaran_id")?.toString() || "";
      const semester = formData.get("semester")?.toString() || "";

      if (!file || !(file instanceof File)) {
        return jsonResponse({ error: "File PDF wajib diupload" }, 400);
      }
      if (!judul.trim()) {
        return jsonResponse({ error: "Judul wajib diisi" }, 400);
      }

      const fileName = file.name;
      const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
      if (file.type !== "application/pdf" && ext !== ".pdf") {
        return jsonResponse({ error: "Format file harus PDF" }, 400);
      }
      if (file.size > 50 * 1024 * 1024) {
        return jsonResponse({ error: "Ukuran file maksimal 50MB" }, 400);
      }

      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("penugasan-files")
        .upload(filePath, file, { contentType: file.type || "application/pdf" });

      if (uploadErr) return jsonResponse({ error: uploadErr.message }, 500);

      const { data, error: dbErr } = await supabase
        .from("penugasan")
        .insert({
          judul,
          deskripsi,
          kelas_id: kelas_id || null,
          mata_pelajaran_id: mata_pelajaran_id || null,
          tipe: "pdf",
          file_path: filePath,
          file_name: fileName,
          file_size: file.size,
          file_type: file.type || "application/pdf",
          link_url: "",
          deadline: deadline || null,
          tahun_ajaran_id: tahun_ajaran_id || null,
          semester: semester || "",
          created_by: user.nama,
        })
        .select("*, kelas:kelas_id(id, nama_kelas, tingkat), mata_pelajaran:mata_pelajaran_id(id, nama)")
        .single();

      if (dbErr) {
        await supabase.storage.from("penugasan-files").remove([filePath]);
        return jsonResponse({ error: dbErr.message }, 500);
      }

      return jsonResponse({ data });
    }

    // ============================================================
    // DASHBOARD: stats
    // ============================================================
    if (action === "stats" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      const url = new URL(req.url);
      const taId = url.searchParams.get("tahun_ajaran_id");
      const semesterFilter = url.searchParams.get("semester");

      if (user.user_type === "admin") {
        let absensiQuery = supabase.from("absensi").select("id", { count: "exact", head: true }).eq("tanggal", new Date().toISOString().split("T")[0]);
        let komiteLunasQuery = supabase.from("komite").select("id", { count: "exact", head: true }).eq("status", "Lunas");
        let komiteBelumQuery = supabase.from("komite").select("id", { count: "exact", head: true }).eq("status", "Belum Lunas");
        if (taId) {
          absensiQuery = absensiQuery.eq("tahun_ajaran_id", taId);
          komiteLunasQuery = komiteLunasQuery.eq("tahun_ajaran_id", taId);
          komiteBelumQuery = komiteBelumQuery.eq("tahun_ajaran_id", taId);
        }
        if (semesterFilter) {
          absensiQuery = absensiQuery.eq("semester", semesterFilter);
          komiteLunasQuery = komiteLunasQuery.eq("semester", semesterFilter);
          komiteBelumQuery = komiteBelumQuery.eq("semester", semesterFilter);
        }
        const [kelas, siswa, absensi, komiteLunas, komiteBelum] = await Promise.all([
          supabase.from("kelas").select("id", { count: "exact", head: true }),
          supabase.from("siswa").select("id", { count: "exact", head: true }),
          absensiQuery,
          komiteLunasQuery,
          komiteBelumQuery,
        ]);
        return jsonResponse({
          kelas: kelas.count || 0,
          siswa: siswa.count || 0,
          absensiHariIni: absensi.count || 0,
          komiteLunas: komiteLunas.count || 0,
          komiteBelumLunas: komiteBelum.count || 0,
        });
      } else {
        const siswaId = user.user_id;
        let absensiQuery = supabase.from("absensi").select("id, status", { count: "exact" }).eq("siswa_id", siswaId);
        let nilaiQuery = supabase.from("nilai").select("nilai", { count: "exact" }).eq("siswa_id", siswaId);
        let komiteQuery = supabase.from("komite").select("id, status", { count: "exact" }).eq("siswa_id", siswaId);
        if (taId) {
          absensiQuery = absensiQuery.eq("tahun_ajaran_id", taId);
          nilaiQuery = nilaiQuery.eq("tahun_ajaran_id", taId);
          komiteQuery = komiteQuery.eq("tahun_ajaran_id", taId);
        }
        if (semesterFilter) {
          absensiQuery = absensiQuery.eq("semester", semesterFilter);
          nilaiQuery = nilaiQuery.eq("semester", semesterFilter);
          komiteQuery = komiteQuery.eq("semester", semesterFilter);
        }
        const [absensi, nilai, komite] = await Promise.all([
          absensiQuery,
          nilaiQuery,
          komiteQuery,
        ]);
        const hadir = (absensi.data || []).filter((a) => a.status === "Hadir").length;
        const sakit = (absensi.data || []).filter((a) => a.status === "Sakit").length;
        const izin = (absensi.data || []).filter((a) => a.status === "Izin").length;
        const alpa = (absensi.data || []).filter((a) => a.status === "Alpa").length;
        const nilaiList = (nilai.data || []).map((n) => Number(n.nilai));
        const rataRata = nilaiList.length > 0
          ? nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length
          : 0;
        const lunas = (komite.data || []).filter((k) => k.status === "Lunas").length;
        const belum = (komite.data || []).filter((k) => k.status === "Belum Lunas").length;
        return jsonResponse({
          totalAbsensi: absensi.count || 0,
          hadir, sakit, izin, alpa,
          rataRata: Math.round(rataRata * 100) / 100,
          totalNilai: nilai.count || 0,
          komiteLunas: lunas,
          komiteBelumLunas: belum,
        });
      }
    }

    // ============================================================
    // ENTITY CRUD: pattern /api/<entity> or /api/<entity>/<id>
    // ============================================================
    const entityRoutes: Record<string, string> = {
      "kelas": "kelas",
      "siswa": "siswa",
      "absensi": "absensi",
      "komite": "komite",
      "nilai": "nilai",
      "akun": "akun",
      "mata-pelajaran": "mata_pelajaran",
      "materi": "materi",
      "pengumuman": "pengumuman",
      "tahun-ajaran": "tahun_ajaran",
      "kesepakatan-kelas": "kesepakatan_kelas",
      "penugasan": "penugasan",
    };

    if (entityRoutes[action]) {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      const table = entityRoutes[action];
      const entityId = rest[0];
      const isAdmin = user.user_type === "admin";

      if (!isAdmin && req.method !== "GET") {
        return jsonResponse({ error: "Akses ditolak: hanya admin yang dapat mengelola data" }, 403);
      }

      // GET - list or detail
      if (req.method === "GET") {
        if (entityId) {
          let query = supabase.from(table).select("*").eq("id", entityId);
          if (table === "materi") {
            query = supabase.from(table).select("*, mata_pelajaran:mata_pelajaran_id(id, nama)").eq("id", entityId);
          }
          if (!isAdmin) {
            if (table === "siswa") {
              query = query.eq("id", user.user_id);
            } else if (["absensi", "komite", "nilai"].includes(table)) {
              query = query.eq("siswa_id", user.user_id);
            } else if (table === "kesepakatan_kelas") {
              const { data: siswaData } = await supabase
                .from("siswa")
                .select("kelas_id")
                .eq("id", user.user_id)
                .maybeSingle();
              if (siswaData?.kelas_id) {
                query = query.eq("kelas_id", siswaData.kelas_id);
              } else {
                return jsonResponse({ error: "Akses ditolak" }, 403);
              }
            } else if (table === "penugasan") {
              query = supabase.from(table).select("*, kelas:kelas_id(id, nama_kelas, tingkat), mata_pelajaran:mata_pelajaran_id(id, nama)").eq("id", entityId);
              const { data: siswaData } = await supabase
                .from("siswa")
                .select("kelas_id")
                .eq("id", user.user_id)
                .maybeSingle();
              if (siswaData?.kelas_id) {
                query = query.eq("kelas_id", siswaData.kelas_id);
              } else {
                return jsonResponse({ error: "Akses ditolak" }, 403);
              }
            } else if (table === "materi") {
              // allowed for all authenticated users
            } else {
              return jsonResponse({ error: "Akses ditolak" }, 403);
            }
          }
          const { data, error } = await query.maybeSingle();
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ data });
        } else {
          let query = supabase.from(table).select("*");
          if (!isAdmin) {
            if (table === "siswa") {
              query = query.eq("id", user.user_id);
            } else if (["absensi", "komite", "nilai"].includes(table)) {
              query = query.eq("siswa_id", user.user_id);
            } else if (table === "pengumuman") {
              query = supabase.from(table).select("*, kelas:kelas_id(id, nama_kelas, tingkat)");
              const { data: siswaData } = await supabase
                .from("siswa")
                .select("kelas_id")
                .eq("id", user.user_id)
                .maybeSingle();
              const siswaKelasId = siswaData?.kelas_id;
              let siswaTingkat = "";
              if (siswaKelasId) {
                const { data: kelasData } = await supabase
                  .from("kelas")
                  .select("tingkat")
                  .eq("id", siswaKelasId)
                  .maybeSingle();
                siswaTingkat = kelasData?.tingkat || "";
              }
              query = query.or(`tingkat.eq.,tingkat.eq.${siswaTingkat}`);
              if (siswaKelasId) {
                query = query.or(`kelas_id.is.null,kelas_id.eq.${siswaKelasId}`);
              } else {
                query = query.is("kelas_id", null);
              }
            } else if (table === "penugasan") {
              query = supabase.from(table).select("*, kelas:kelas_id(id, nama_kelas, tingkat), mata_pelajaran:mata_pelajaran_id(id, nama)");
              const { data: siswaData } = await supabase
                .from("siswa")
                .select("kelas_id")
                .eq("id", user.user_id)
                .maybeSingle();
              const siswaKelasId = siswaData?.kelas_id;
              if (siswaKelasId) {
                query = query.eq("kelas_id", siswaKelasId);
              } else {
                query = query.eq("kelas_id", "__NO_MATCH__");
              }
            } else if (table === "materi") {
              // allowed for all authenticated users
            } else {
              return jsonResponse({ error: "Akses ditolak" }, 403);
            }
          } else if (table === "pengumuman") {
            query = supabase.from(table).select("*, kelas:kelas_id(id, nama_kelas, tingkat)");
          }
          if (table === "materi") {
            query = supabase.from(table).select("*, mata_pelajaran:mata_pelajaran_id(id, nama)");
          }
          if (isAdmin && table === "penugasan") {
            query = supabase.from(table).select("*, kelas:kelas_id(id, nama_kelas, tingkat), mata_pelajaran:mata_pelajaran_id(id, nama)");
          }

          const page = parseInt(new URL(req.url).searchParams.get("page") || "1");
          const perPage = parseInt(new URL(req.url).searchParams.get("per_page") || "1000");
          const search = new URL(req.url).searchParams.get("search") || "";
          const kelasFilter = new URL(req.url).searchParams.get("kelas_id") || "";

          if (search) {
            if (table === "siswa") {
              query = query.or(`nama.ilike.%${search}%,nisn.ilike.%${search}%`);
            } else if (table === "kelas") {
              query = query.or(`nama_kelas.ilike.%${search}%,wali_kelas.ilike.%${search}%`);
            } else if (table === "akun") {
              query = query.or(`username.ilike.%${search}%,nama.ilike.%${search}%`);
            } else if (table === "nilai") {
              query = query.ilike("mata_pelajaran", `%${search}%`);
            } else if (table === "mata_pelajaran") {
              query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
            } else if (table === "materi") {
              query = query.ilike("judul", `%${search}%`);
            } else if (table === "pengumuman") {
              query = query.or(`judul.ilike.%${search}%,isi.ilike.%${search}%`);
            } else if (table === "kesepakatan_kelas") {
              query = query.or(`judul.ilike.%${search}%,isi.ilike.%${search}%`);
            } else if (table === "penugasan") {
              query = query.ilike("judul", `%${search}%`);
            }
          }

          // Filter by tingkat for materi
          if (table === "materi") {
            const tingkatFilter = new URL(req.url).searchParams.get("tingkat");
            if (tingkatFilter) query = query.eq("tingkat", tingkatFilter);
          }

          // Filter by tahun_ajaran_id and semester for absensi, komite, nilai, kesepakatan_kelas
          if (["absensi", "komite", "nilai", "kesepakatan_kelas"].includes(table)) {
            const taId = new URL(req.url).searchParams.get("tahun_ajaran_id");
            const semesterFilter = new URL(req.url).searchParams.get("semester");
            if (taId) query = query.eq("tahun_ajaran_id", taId);
            if (semesterFilter) query = query.eq("semester", semesterFilter);
          }
          if (kelasFilter && table === "siswa") {
            query = query.eq("kelas_id", kelasFilter);
          }
          if (kelasFilter && table === "absensi") {
            query = query.eq("kelas_id", kelasFilter);
          }
          if (kelasFilter && table === "kesepakatan_kelas") {
            query = query.eq("kelas_id", kelasFilter);
          }
          if (kelasFilter && table === "penugasan") {
            query = query.eq("kelas_id", kelasFilter);
          }
          if (table === "penugasan") {
            const tipeFilter = new URL(req.url).searchParams.get("tipe");
            if (tipeFilter) query = query.eq("tipe", tipeFilter);
          }

          const orderBy = new URL(req.url).searchParams.get("order_by");
          if (orderBy) {
            const desc = new URL(req.url).searchParams.get("order_dir") === "desc";
            query = query.order(orderBy, { ascending: !desc });
          } else {
            if (table === "siswa") query = query.order("nama", { ascending: true });
            else if (table === "kelas") query = query.order("nama_kelas", { ascending: true });
            else if (table === "absensi") query = query.order("tanggal", { ascending: false });
            else if (table === "komite") query = query.order("created_at", { ascending: false });
            else if (table === "nilai") query = query.order("mata_pelajaran", { ascending: true });
            else if (table === "mata_pelajaran") query = query.order("nama", { ascending: true });
            else if (table === "materi") query = query.order("created_at", { ascending: false });
            else if (table === "pengumuman") query = query.order("created_at", { ascending: false });
            else if (table === "kesepakatan_kelas") query = query.order("tanggal_dibuat", { ascending: false });
            else if (table === "penugasan") query = query.order("created_at", { ascending: false });
            else query = query.order("created_at", { ascending: false });
          }

          const from = (page - 1) * perPage;
          const to = from + perPage - 1;
          query = query.range(from, to);

          const { data, error, count } = await query;
          if (error) return jsonResponse({ error: error.message }, 500);

          if (table === "siswa" && Array.isArray(data)) {
            for (const s of data) {
              const defaultHash = await sha256(SALT + s.nisn);
              const currentHash = s.password_1 || s.password_hash || "";
              s.pwd_is_default = currentHash === defaultHash;
            }
          }

          return jsonResponse({ data, total: count || data?.length || 0, page, perPage });
        }
      }

      // POST - create
      if (req.method === "POST" && !entityId) {
        if (table === "penugasan") {
          return jsonResponse({ error: "Gunakan endpoint /penugasan-upload untuk upload PDF, atau POST dengan tipe link" }, 400);
        }
        const body = await req.json();

        if (table === "siswa") {
          if (body.password_1 && body.password_1.trim()) {
            body.password_1 = await sha256(SALT + body.password_1.trim());
            body.password_hash = body.password_1;
          } else if (body.nisn) {
            const hash = await sha256(SALT + body.nisn);
            body.password_1 = hash;
            body.password_hash = hash;
          }
          if (body.password_2 && body.password_2.trim()) {
            body.password_2 = await sha256(SALT + body.password_2.trim());
          } else {
            delete body.password_2;
          }
          delete body.password;
        }
        if (table === "akun" && body.password) {
          body.password_hash = await sha256(SALT + body.password);
          delete body.password;
        }

        if (table === "pengumuman") {
          body.created_by = user.nama || "";
        }
        if (table === "kesepakatan_kelas") {
          body.tanggal_dibuat = body.tanggal_dibuat || new Date().toISOString().split("T")[0];
        }
        if (table === "materi") {
          if (!body.judul?.trim()) return jsonResponse({ error: "Judul wajib diisi" }, 400);
          if (body.tipe === "link" && !body.link_url?.trim()) return jsonResponse({ error: "URL link wajib diisi" }, 400);
          body.tipe = body.tipe || "link";
          body.uploaded_by = user.nama || "";
          body.file_path = "";
          body.file_name = "";
          body.file_size = 0;
          body.file_type = "";
          const { data, error } = await supabase.from(table).insert(body).select("*, mata_pelajaran:mata_pelajaran_id(id, nama)").single();
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ data });
        }
        if (table === "penugasan") {
          const { data, error } = await supabase.from(table).insert(body).select("*, kelas:kelas_id(id, nama_kelas, tingkat), mata_pelajaran:mata_pelajaran_id(id, nama)").single();
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ data });
        }
        const { data, error } = await supabase.from(table).insert(body).select().single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      }

      // PUT - update
      if (req.method === "PUT" && entityId) {
        const body = await req.json();
        body.updated_at = new Date().toISOString();

        if (table === "siswa") {
          if (body.password_1 && body.password_1.trim()) {
            body.password_1 = await sha256(SALT + body.password_1.trim());
            body.password_hash = body.password_1;
          } else {
            delete body.password_1;
          }
          if (body.password_2 && body.password_2.trim()) {
            body.password_2 = await sha256(SALT + body.password_2.trim());
          } else {
            delete body.password_2;
          }
          delete body.password;
        }
        if (table === "akun" && body.password) {
          body.password_hash = await sha256(SALT + body.password);
          delete body.password;
        }

        if (table === "materi") {
          const { data, error } = await supabase
            .from(table)
            .update({
              judul: body.judul,
              mata_pelajaran_id: body.mata_pelajaran_id || null,
              tingkat: body.tingkat || "",
              link_url: body.link_url ?? undefined,
            })
            .eq("id", entityId)
            .select("*, mata_pelajaran:mata_pelajaran_id(id, nama)")
            .single();
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ data });
        }
        if (table === "penugasan") {
          delete body.tipe;
          delete body.file_path;
          delete body.file_name;
          delete body.file_size;
          delete body.file_type;
          const { data, error } = await supabase
            .from(table)
            .update(body)
            .eq("id", entityId)
            .select("*, kelas:kelas_id(id, nama_kelas, tingkat), mata_pelajaran:mata_pelajaran_id(id, nama)")
            .single();
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ data });
        }

        const { data, error } = await supabase.from(table).update(body).eq("id", entityId).select().single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      }

      // DELETE
      if (req.method === "DELETE" && entityId) {
        if (table === "materi") {
          const { data: mat } = await supabase
            .from("materi")
            .select("file_path, tipe")
            .eq("id", entityId)
            .maybeSingle();
          if (mat?.tipe === "file" && mat?.file_path) {
            await supabase.storage.from("materi-files").remove([mat.file_path]);
          }
        }
        if (table === "penugasan") {
          const { data: pen } = await supabase
            .from("penugasan")
            .select("file_path, tipe")
            .eq("id", entityId)
            .maybeSingle();
          if (pen?.tipe === "pdf" && pen?.file_path) {
            await supabase.storage.from("penugasan-files").remove([pen.file_path]);
          }
        }
        const { error } = await supabase.from(table).delete().eq("id", entityId);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      }
    }

    // ============================================================
    // SISWA PROFILE
    // ============================================================
    if (action === "profile" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);

      if (user.user_type === "siswa") {
        const { data, error } = await supabase
          .from("siswa")
          .select("*, kelas:kelas_id(*)")
          .eq("id", user.user_id)
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      } else {
        const { data, error } = await supabase
          .from("akun")
          .select("id, username, nama, role, created_at")
          .eq("id", user.user_id)
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ data });
      }
    }

    // ============================================================
    // SET ACTIVE TAHUN AJARAN
    // ============================================================
    if (action === "tahun-ajaran-active" && req.method === "PUT") {
      const user = await getAuthUser(req);
      if (!user) return jsonResponse({ error: "Tidak terautentikasi" }, 401);
      if (user.user_type !== "admin") return jsonResponse({ error: "Akses ditolak" }, 403);

      const { id, semester_aktif } = await req.json();
      if (!id) return jsonResponse({ error: "ID tahun ajaran wajib diisi" }, 400);

      await supabase.from("tahun_ajaran").update({ is_active: false }).neq("id", id);
      const { data, error } = await supabase
        .from("tahun_ajaran")
        .update({ is_active: true, semester_aktif: semester_aktif || "Ganjil", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ data });
    }

    return jsonResponse({ error: "Endpoint tidak ditemukan", debug: { action, rest, method: req.method } }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || "Terjadi kesalahan server" }, 500);
  }
});
