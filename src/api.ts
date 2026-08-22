import type {
  Akun,
  Absensi,
  AbsensiBatchEntry,
  AbsensiBatchResponse,
  AdminStats,
  Kelas,
  Keaktifan,
  Komite,
  ListResponse,
  MataPelajaran,
  Materi,
  Nilai,
  Pengumuman,
  Penugasan,
  SessionUser,
  Siswa,
  SiswaStats,
  TahunAjaran,
  KesepakatanKelas,
} from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/api`;

export function getToken(): string | null {
  return localStorage.getItem("ma-las-token");
}

function authHeaders(isFormData = false): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token || ""}`,
    apikey: ANON_KEY,
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(isFormData), ...(options.headers || {}) },
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request gagal (${res.status})`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ============================================================
// AUTH
// ============================================================
export const api = {
  async login(username: string, password: string): Promise<SessionUser> {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Login gagal");
    localStorage.setItem("ma-las-token", body.token);
    localStorage.setItem("ma-las-user", JSON.stringify(body));
    return body as SessionUser;
  },

  async logout(): Promise<void> {
    try {
      await request("/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("ma-las-token");
      localStorage.removeItem("ma-las-user");
    }
  },

  getStoredUser(): SessionUser | null {
    const raw = localStorage.getItem("ma-las-user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  },

  async verify(): Promise<{ user: { user_id: string; user_type: string; username: string; nama: string } }> {
    return request("/verify");
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await request("/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  async resetSiswaPassword(siswaId: string, newNisn: string): Promise<void> {
    await request("/reset-siswa-password", {
      method: "POST",
      body: JSON.stringify({ siswaId, newNisn }),
    });
  },

  async setSiswaOrtuPassword(siswaId: string, password: string): Promise<void> {
    await request("/set-siswa-ortu-password", {
      method: "POST",
      body: JSON.stringify({ siswaId, password }),
    });
  },

  // ============================================================
  // STATS
  // ============================================================
  async getStats(params?: { tahun_ajaran_id?: string; semester?: string }): Promise<AdminStats | SiswaStats> {
    const q = new URLSearchParams();
    if (params?.tahun_ajaran_id) q.set("tahun_ajaran_id", params.tahun_ajaran_id);
    if (params?.semester) q.set("semester", params.semester);
    const qs = q.toString();
    return request(`/stats${qs ? `?${qs}` : ""}`);
  },

  async getProfile(): Promise<{ data: Siswa | Akun }> {
    return request("/profile");
  },

  // ============================================================
  // KELAS
  // ============================================================
  async listKelas(params?: { search?: string; page?: number }): Promise<ListResponse<Kelas>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    return request(`/kelas?${q.toString()}`);
  },

  async getKelas(id: string): Promise<{ data: Kelas }> {
    return request(`/kelas/${id}`);
  },

  async createKelas(data: Partial<Kelas>): Promise<{ data: Kelas }> {
    return request("/kelas", { method: "POST", body: JSON.stringify(data) });
  },

  async updateKelas(id: string, data: Partial<Kelas>): Promise<{ data: Kelas }> {
    return request(`/kelas/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteKelas(id: string): Promise<void> {
    await request(`/kelas/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // SISWA
  // ============================================================
  async listSiswa(params?: { search?: string; kelas_id?: string; page?: number }): Promise<ListResponse<Siswa>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.kelas_id) q.set("kelas_id", params.kelas_id);
    if (params?.page) q.set("page", String(params.page));
    return request(`/siswa?${q.toString()}`);
  },

  async getSiswa(id: string): Promise<{ data: Siswa }> {
    return request(`/siswa/${id}`);
  },

  async createSiswa(data: Partial<Siswa>): Promise<{ data: Siswa }> {
    return request("/siswa", { method: "POST", body: JSON.stringify(data) });
  },

  async updateSiswa(id: string, data: Partial<Siswa>): Promise<{ data: Siswa }> {
    return request(`/siswa/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteSiswa(id: string): Promise<void> {
    await request(`/siswa/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // ABSENSI
  // ============================================================
  async listAbsensi(params?: { search?: string; kelas_id?: string; page?: number; tahun_ajaran_id?: string; semester?: string }): Promise<ListResponse<Absensi>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.kelas_id) q.set("kelas_id", params.kelas_id);
    if (params?.page) q.set("page", String(params.page));
    if (params?.tahun_ajaran_id) q.set("tahun_ajaran_id", params.tahun_ajaran_id);
    if (params?.semester) q.set("semester", params.semester);
    return request(`/absensi?${q.toString()}`);
  },

  async createAbsensi(data: Partial<Absensi>): Promise<{ data: Absensi }> {
    return request("/absensi", { method: "POST", body: JSON.stringify(data) });
  },

  async updateAbsensi(id: string, data: Partial<Absensi>): Promise<{ data: Absensi }> {
    return request(`/absensi/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteAbsensi(id: string): Promise<void> {
    await request(`/absensi/${id}`, { method: "DELETE" });
  },

  async getAbsensiBatch(kelasId: string, tanggal: string): Promise<AbsensiBatchResponse> {
    const q = new URLSearchParams({ kelas_id: kelasId, tanggal });
    return request(`/absensi-batch?${q.toString()}`);
  },

  async saveAbsensiBatch(
    kelasId: string,
    tanggal: string,
    materiAjar: string,
    entries: AbsensiBatchEntry[],
    tahunAjaranId?: string,
    semester?: string,
  ): Promise<{ success: boolean; saved: number }> {
    return request("/absensi-batch", {
      method: "POST",
      body: JSON.stringify({
        kelas_id: kelasId,
        tanggal,
        materi_ajar: materiAjar,
        entries: entries.map((e) => ({ siswa_id: e.siswa_id, status: e.status, keterangan: e.keterangan })),
        tahun_ajaran_id: tahunAjaranId,
        semester,
      }),
    });
  },

  // ============================================================
  // KOMITE
  // ============================================================
  async listKomite(params?: { search?: string; page?: number; tahun_ajaran_id?: string; semester?: string }): Promise<ListResponse<Komite>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.tahun_ajaran_id) q.set("tahun_ajaran_id", params.tahun_ajaran_id);
    if (params?.semester) q.set("semester", params.semester);
    return request(`/komite?${q.toString()}`);
  },

  async createKomite(data: Partial<Komite>): Promise<{ data: Komite }> {
    return request("/komite", { method: "POST", body: JSON.stringify(data) });
  },

  async updateKomite(id: string, data: Partial<Komite>): Promise<{ data: Komite }> {
    return request(`/komite/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteKomite(id: string): Promise<void> {
    await request(`/komite/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // NILAI
  // ============================================================
  async listNilai(params?: { search?: string; page?: number; tahun_ajaran_id?: string; semester?: string }): Promise<ListResponse<Nilai>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.tahun_ajaran_id) q.set("tahun_ajaran_id", params.tahun_ajaran_id);
    if (params?.semester) q.set("semester", params.semester);
    return request(`/nilai?${q.toString()}`);
  },

  async createNilai(data: Partial<Nilai>): Promise<{ data: Nilai }> {
    return request("/nilai", { method: "POST", body: JSON.stringify(data) });
  },

  async updateNilai(id: string, data: Partial<Nilai>): Promise<{ data: Nilai }> {
    return request(`/nilai/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteNilai(id: string): Promise<void> {
    await request(`/nilai/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // AKUN (admin accounts)
  // ============================================================
  async listAkun(params?: { search?: string; page?: number }): Promise<ListResponse<Akun>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    return request(`/akun?${q.toString()}`);
  },

  async createAkun(data: { username: string; password: string; nama: string; role?: string }): Promise<{ data: Akun }> {
    return request("/akun", { method: "POST", body: JSON.stringify(data) });
  },

  async updateAkun(id: string, data: Partial<Akun> & { password?: string }): Promise<{ data: Akun }> {
    return request(`/akun/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteAkun(id: string): Promise<void> {
    await request(`/akun/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // MATA PELAJARAN
  // ============================================================
  async listMataPelajaran(params?: { search?: string }): Promise<ListResponse<MataPelajaran>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    return request(`/mata-pelajaran?${q.toString()}`);
  },

  async createMataPelajaran(data: { nama: string; kode?: string; keterangan?: string }): Promise<{ data: MataPelajaran }> {
    return request("/mata-pelajaran", { method: "POST", body: JSON.stringify(data) });
  },

  async updateMataPelajaran(id: string, data: Partial<MataPelajaran>): Promise<{ data: MataPelajaran }> {
    return request(`/mata-pelajaran/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteMataPelajaran(id: string): Promise<void> {
    await request(`/mata-pelajaran/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // MATERI (PPT/file upload)
  // ============================================================
  async listMateri(params?: { search?: string; tingkat?: string }): Promise<ListResponse<Materi>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.tingkat) q.set("tingkat", params.tingkat);
    return request(`/materi?${q.toString()}`);
  },

  async uploadMateri(file: File, judul: string, mataPelajaranId: string, tingkat: string): Promise<{ data: Materi }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("judul", judul);
    formData.append("mata_pelajaran_id", mataPelajaranId);
    formData.append("tingkat", tingkat);
    return request("/materi-upload", { method: "POST", body: formData });
  },

  async createMateriLink(data: {
    judul: string;
    mata_pelajaran_id: string | null;
    tingkat: string;
    link_url: string;
  }): Promise<{ data: Materi }> {
    return request("/materi", { method: "POST", body: JSON.stringify(data) });
  },

  async updateMateri(id: string, data: { judul: string; mata_pelajaran_id: string | null; tingkat: string; link_url?: string }): Promise<{ data: Materi }> {
    return request(`/materi/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteMateri(id: string): Promise<void> {
    await request(`/materi/${id}`, { method: "DELETE" });
  },

  getMateriDownloadUrl(id: string): string {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/materi-download/${id}`;
  },

  // ============================================================
  // PENGUMUMAN
  // ============================================================
  async listPengumuman(params?: { search?: string }): Promise<ListResponse<Pengumuman>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    return request(`/pengumuman?${q.toString()}`);
  },

  async createPengumuman(data: { judul: string; isi: string; tingkat?: string; kelas_id?: string | null }): Promise<{ data: Pengumuman }> {
    return request("/pengumuman", { method: "POST", body: JSON.stringify(data) });
  },

  async updatePengumuman(id: string, data: Partial<Pengumuman>): Promise<{ data: Pengumuman }> {
    return request(`/pengumuman/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deletePengumuman(id: string): Promise<void> {
    await request(`/pengumuman/${id}`, { method: "DELETE" });
  },

  // ============================================================
  // TAHUN AJARAN
  // ============================================================
  async listTahunAjaranPublic(): Promise<ListResponse<TahunAjaran>> {
    return request("/tahun-ajaran-public");
  },

  async listTahunAjaran(): Promise<ListResponse<TahunAjaran>> {
    return request("/tahun-ajaran");
  },

  async createTahunAjaran(data: { nama: string; semester_aktif?: string }): Promise<{ data: TahunAjaran }> {
    return request("/tahun-ajaran", { method: "POST", body: JSON.stringify(data) });
  },

  async updateTahunAjaran(id: string, data: Partial<TahunAjaran>): Promise<{ data: TahunAjaran }> {
    return request(`/tahun-ajaran/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteTahunAjaran(id: string): Promise<void> {
    await request(`/tahun-ajaran/${id}`, { method: "DELETE" });
  },

  async setActiveTahunAjaran(id: string, semesterAktif: string): Promise<{ data: TahunAjaran }> {
    return request("/tahun-ajaran-active", { method: "PUT", body: JSON.stringify({ id, semester_aktif: semesterAktif }) });
  },


  // ============================================================
  // KESEPAKATAN KELAS
  // ============================================================
  async listKesepakatanKelas(params?: { search?: string; kelas_id?: string; tahun_ajaran_id?: string; semester?: string }): Promise<ListResponse<KesepakatanKelas>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.kelas_id) q.set("kelas_id", params.kelas_id);
    if (params?.tahun_ajaran_id) q.set("tahun_ajaran_id", params.tahun_ajaran_id);
    if (params?.semester) q.set("semester", params.semester);
    return request(`/kesepakatan-kelas?${q.toString()}`);
  },

  async createKesepakatanKelas(data: { kelas_id: string; judul: string; isi: string; tanggal_dibuat?: string; tahun_ajaran_id?: string; semester?: string }): Promise<{ data: KesepakatanKelas }> {
    return request("/kesepakatan-kelas", { method: "POST", body: JSON.stringify(data) });
  },

  async updateKesepakatanKelas(id: string, data: Partial<KesepakatanKelas>): Promise<{ data: KesepakatanKelas }> {
    return request(`/kesepakatan-kelas/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteKesepakatanKelas(id: string): Promise<void> {
    await request(`/kesepakatan-kelas/${id}`, { method: "DELETE" });
  },


  // ============================================================
  // PENUGASAN
  // ============================================================
  async listPenugasan(params?: { search?: string; kelas_id?: string; tipe?: string }): Promise<ListResponse<Penugasan>> {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.kelas_id) q.set("kelas_id", params.kelas_id);
    if (params?.tipe) q.set("tipe", params.tipe);
    return request(`/penugasan?${q.toString()}`);
  },

  async uploadPenugasanPDF(file: File, data: {
    judul: string;
    deskripsi: string;
    kelas_id: string;
    mata_pelajaran_id: string;
    deadline: string;
    tahun_ajaran_id: string;
    semester: string;
  }): Promise<{ data: Penugasan }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("judul", data.judul);
    formData.append("deskripsi", data.deskripsi);
    formData.append("kelas_id", data.kelas_id);
    formData.append("mata_pelajaran_id", data.mata_pelajaran_id);
    formData.append("deadline", data.deadline);
    formData.append("tahun_ajaran_id", data.tahun_ajaran_id);
    formData.append("semester", data.semester);
    return request("/penugasan-upload", { method: "POST", body: formData });
  },

  async createPenugasanLink(data: {
    judul: string;
    deskripsi: string;
    kelas_id: string | null;
    mata_pelajaran_id: string | null;
    link_url: string;
    deadline: string | null;
    tahun_ajaran_id: string | null;
    semester: string;
  }): Promise<{ data: Penugasan }> {
    return request("/penugasan", { method: "POST", body: JSON.stringify(data) });
  },

  async updatePenugasan(id: string, data: Partial<Penugasan>): Promise<{ data: Penugasan }> {
    return request(`/penugasan/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async deletePenugasan(id: string): Promise<void> {
    await request(`/penugasan/${id}`, { method: "DELETE" });
  },

  getPenugasanDownloadUrl(id: string): string {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/penugasan-download/${id}`;
  },

  // ============================================================
  // SISWA BULK IMPORT
  // ============================================================
  async bulkImportSiswa(data: { siswaList: Record<string, string>[]; kelasMap: Record<string, string> }): Promise<{ success: boolean; inserted: number; updated: number; errors: { row: number; nisn: string; message: string }[]; total: number }> {
    return request("/siswa-bulk", { method: "POST", body: JSON.stringify(data) });
  },

  // ============================================================
  // KEAKTIFAN
  // ============================================================
  async listKeaktifan(params?: { kelas_id?: string; tahun_ajaran_id?: string; semester?: string }): Promise<ListResponse<Keaktifan>> {
    const q = new URLSearchParams();
    if (params?.kelas_id) q.set("kelas_id", params.kelas_id);
    if (params?.tahun_ajaran_id) q.set("tahun_ajaran_id", params.tahun_ajaran_id);
    if (params?.semester) q.set("semester", params.semester);
    return request(`/keaktifan?${q.toString()}`);
  },

  async upsertKeaktifanBatch(entries: { siswa_id: string; slots: boolean[]; aktif_count: number }[], kelasId: string, tahunAjaranId?: string, semester?: string): Promise<{ success: boolean; saved: number }> {
    return request("/keaktifan-batch", {
      method: "POST",
      body: JSON.stringify({
        kelas_id: kelasId,
        tahun_ajaran_id: tahunAjaranId,
        semester,
        entries: entries.map((e) => ({ siswa_id: e.siswa_id, slots: e.slots, aktif_count: e.aktif_count })),
      }),
    });
  },
};
