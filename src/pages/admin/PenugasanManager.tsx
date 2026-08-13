import { useEffect, useState, useCallback, useRef } from "react";
import { api, getToken } from "../../api";
import type { Penugasan, Kelas, MataPelajaran } from "../../types";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  FileText,
  Link as LinkIcon,
  Download,
  Upload,
  X,
  CalendarClock,
  ClipboardList,
} from "lucide-react";

interface FormState {
  judul: string;
  deskripsi: string;
  kelas_id: string;
  mata_pelajaran_id: string;
  tipe: "pdf" | "link";
  link_url: string;
  deadline: string;
}

const emptyForm: FormState = {
  judul: "",
  deskripsi: "",
  kelas_id: "",
  mata_pelajaran_id: "",
  tipe: "link",
  link_url: "",
  deadline: "",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

export default function PenugasanManager() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [data, setData] = useState<Penugasan[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");
  const [tipeFilter, setTipeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Penugasan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.listPenugasan({ search, kelas_id: kelasFilter, tipe: tipeFilter }),
      api.listKelas(),
      api.listMataPelajaran(),
    ])
      .then(([penRes, kelasRes, mapelRes]) => {
        setData(penRes.data);
        setKelasList(kelasRes.data);
        setMapelList(mapelRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, kelasFilter, tipeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (p: Penugasan) => {
    setEditing(p);
    setForm({
      judul: p.judul,
      deskripsi: p.deskripsi,
      kelas_id: p.kelas_id || "",
      mata_pelajaran_id: p.mata_pelajaran_id || "",
      tipe: p.tipe,
      link_url: p.link_url || "",
      deadline: p.deadline || "",
    });
    setFile(null);
    setFormError("");
    setModalOpen(true);
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (selectedFile.type !== "application/pdf" && ext !== ".pdf") {
      setFormError("Format file harus PDF");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setFormError("Ukuran file maksimal 50MB");
      return;
    }
    setFile(selectedFile);
    setFormError("");
    if (!form.judul) {
      setForm((prev) => ({ ...prev, judul: selectedFile.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.judul.trim()) {
      setFormError("Judul wajib diisi");
      return;
    }
    if (form.tipe === "link" && !form.link_url.trim()) {
      setFormError("URL link wajib diisi");
      return;
    }
    if (form.tipe === "pdf" && !editing && !file) {
      setFormError("File PDF wajib diupload");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updatePenugasan(editing.id, {
          judul: form.judul,
          deskripsi: form.deskripsi,
          kelas_id: form.kelas_id || null,
          mata_pelajaran_id: form.mata_pelajaran_id || null,
          link_url: form.tipe === "link" ? form.link_url : "",
          deadline: form.deadline || null,
        });
      } else {
        if (form.tipe === "pdf" && file) {
          await api.uploadPenugasanPDF(file, {
            judul: form.judul,
            deskripsi: form.deskripsi,
            kelas_id: form.kelas_id,
            mata_pelajaran_id: form.mata_pelajaran_id,
            deadline: form.deadline,
            tahun_ajaran_id: selectedTahunAjaranId,
            semester: selectedSemester,
          });
        } else {
          await api.createPenugasanLink({
            judul: form.judul,
            deskripsi: form.deskripsi,
            kelas_id: form.kelas_id || null,
            mata_pelajaran_id: form.mata_pelajaran_id || null,
            link_url: form.link_url,
            deadline: form.deadline || null,
            tahun_ajaran_id: selectedTahunAjaranId || null,
            semester: selectedSemester,
          });
        }
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePenugasan(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (p: Penugasan) => {
    setDownloadingId(p.id);
    try {
      const token = getToken();
      const res = await fetch(api.getPenugasanDownloadUrl(p.id), {
        headers: {
          Authorization: `Bearer ${token || ""}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) throw new Error("Gagal mengunduh file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = p.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Penugasan"
        subtitle="Buat tugas untuk siswa/kelas dalam bentuk PDF atau link URL"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Penugasan
          </button>
        }
      />

      <div className="card mb-4 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari penugasan..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={kelasFilter}
          onChange={(e) => setKelasFilter(e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
          ))}
        </select>
        <select
          value={tipeFilter}
          onChange={(e) => setTipeFilter(e.target.value)}
          className="input-field sm:w-36"
        >
          <option value="">Semua Tipe</option>
          <option value="pdf">PDF</option>
          <option value="link">Link</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada penugasan" subtitle="Klik 'Tambah Penugasan' untuk membuat tugas pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Judul</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tipe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Kelas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mapel</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Deadline</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((p) => {
                  const overdue = isOverdue(p.deadline);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            p.tipe === "pdf" ? "text-red-500 bg-red-50" : "text-blue-500 bg-blue-50"
                          }`}>
                            {p.tipe === "pdf" ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-[200px]">{p.judul}</p>
                            {p.deskripsi && (
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">{p.deskripsi}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${p.tipe === "pdf" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {p.tipe === "pdf" ? "PDF" : "Link"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.kelas?.nama_kelas || <span className="text-slate-400 text-xs">Semua Kelas</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.mata_pelajaran?.nama || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {p.deadline ? (
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className={`w-3.5 h-3.5 ${overdue ? "text-red-500" : "text-slate-400"}`} />
                            <span className={`text-xs ${overdue ? "text-red-600 font-medium" : "text-slate-600"}`}>
                              {new Date(p.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {p.tipe === "pdf" && (
                            <button
                              onClick={() => handleDownload(p)}
                              className="btn-icon hover:bg-teal-50"
                              title="Download PDF"
                              disabled={downloadingId === p.id}
                            >
                              {downloadingId === p.id ? (
                                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 text-teal-600" />
                              )}
                            </button>
                          )}
                          {p.tipe === "link" && p.link_url && (
                            <a
                              href={p.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-icon hover:bg-blue-50"
                              title="Buka Link"
                            >
                              <LinkIcon className="w-4 h-4 text-blue-600" />
                            </a>
                          )}
                          <button onClick={() => openEdit(p)} className="btn-icon" title="Edit">
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="btn-icon hover:bg-red-50" title="Hapus">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Penugasan" : "Tambah Penugasan"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Tipe Penugasan *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setForm({ ...form, tipe: "link" }); setFile(null); setFormError(""); }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all ${
                  form.tipe === "link"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Link URL</span>
              </button>
              <button
                type="button"
                onClick={() => { setForm({ ...form, tipe: "pdf" }); setFormError(""); }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all ${
                  form.tipe === "pdf"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">File PDF</span>
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Judul *</label>
            <input
              type="text"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              className="input-field"
              placeholder="Judul penugasan..."
              disabled={saving}
            />
          </div>

          <div>
            <label className="input-label">Deskripsi / Instruksi</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="input-field min-h-[80px] resize-y"
              placeholder="Petunjuk pengerjaan tugas..."
              disabled={saving}
            />
          </div>

          {form.tipe === "link" && (
            <div>
              <label className="input-label">URL Link *</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                className="input-field"
                placeholder="https://..."
                disabled={saving}
              />
            </div>
          )}

          {form.tipe === "pdf" && !editing && (
            <div>
              <label className="input-label">File PDF *</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragOver ? "border-red-500 bg-red-50" : "border-slate-300 hover:border-red-400 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-red-500 bg-red-50">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="ml-2 p-1 rounded hover:bg-slate-200"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">Tarik file PDF atau klik untuk memilih</p>
                    <p className="text-xs text-slate-400 mt-1">Format: PDF • Maks 50MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {form.tipe === "pdf" && editing && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span className="truncate">{editing.file_name}</span>
              <span className="text-xs text-slate-400">({formatSize(editing.file_size)})</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Kelas Tujuan</label>
              <select
                value={form.kelas_id}
                onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Mata Pelajaran</label>
              <select
                value={form.mata_pelajaran_id}
                onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="">Tanpa mapel</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Penugasan"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.judul}"?`}
        loading={deleting}
      />
    </div>
  );
}
