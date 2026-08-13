import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../api";
import type { Materi, MataPelajaran } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getToken } from "../../api";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  FileText,
  Presentation,
  Download,
  Upload,
  File,
  X,
  GraduationCap,
  Link as LinkIcon,
  Pencil,
} from "lucide-react";

const TINGKAT_OPTIONS = ["X", "XI", "XII"];

const tingkatBadge: Record<string, string> = {
  X: "bg-blue-100 text-blue-700",
  XI: "bg-teal-100 text-teal-700",
  XII: "bg-purple-100 text-purple-700",
};

function getFileIcon(name: string) {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return FileText;
  if (ext === ".ppt" || ext === ".pptx") return Presentation;
  return File;
}

function getFileColor(_type: string, name: string) {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return "text-red-500 bg-red-50";
  if (ext === ".ppt" || ext === ".pptx") return "text-orange-500 bg-orange-50";
  return "text-blue-500 bg-blue-50";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadForm {
  judul: string;
  mata_pelajaran_id: string;
  tingkat: string;
  tipe: "file" | "link";
  link_url: string;
}

const emptyUploadForm: UploadForm = {
  judul: "",
  mata_pelajaran_id: "",
  tingkat: "",
  tipe: "file",
  link_url: "",
};

export default function MateriManager() {
  const [data, setData] = useState<Materi[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tingkatFilter, setTingkatFilter] = useState("");
  const [uploadModal, setUploadModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState<Materi | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadForm>(emptyUploadForm);
  const [editForm, setEditForm] = useState({ judul: "", mata_pelajaran_id: "", tingkat: "", link_url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Materi | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.listMateri({ search, tingkat: tingkatFilter }),
      api.listMataPelajaran(),
    ])
      .then(([materiRes, mapelRes]) => {
        setData(materiRes.data);
        setMapelList(mapelRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, tingkatFilter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const openUpload = () => {
    setUploadForm(emptyUploadForm);
    setFile(null);
    setUploadError("");
    setUploadModal(true);
  };

  const openEdit = (m: Materi) => {
    setEditing(m);
    setEditForm({
      judul: m.judul,
      mata_pelajaran_id: m.mata_pelajaran_id || "",
      tingkat: m.tingkat || "",
      link_url: m.link_url || "",
    });
    setEditError("");
    setEditModal(true);
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;
    const allowedExtensions = [".ppt", ".pptx", ".pdf", ".doc", ".docx"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setUploadError("Format file tidak didukung. Gunakan PPT, PPTX, PDF, DOC, atau DOCX.");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 50MB");
      return;
    }
    setFile(selectedFile);
    setUploadError("");
    if (!uploadForm.judul) {
      setUploadForm((prev) => ({ ...prev, judul: selectedFile.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    if (!uploadForm.judul.trim()) {
      setUploadError("Judul wajib diisi");
      return;
    }
    if (uploadForm.tipe === "file" && !file) {
      setUploadError("File wajib diupload");
      return;
    }
    if (uploadForm.tipe === "link" && !uploadForm.link_url.trim()) {
      setUploadError("URL link wajib diisi");
      return;
    }
    setUploading(true);
    try {
      if (uploadForm.tipe === "file" && file) {
        await api.uploadMateri(file, uploadForm.judul, uploadForm.mata_pelajaran_id, uploadForm.tingkat);
      } else {
        await api.createMateriLink({
          judul: uploadForm.judul,
          mata_pelajaran_id: uploadForm.mata_pelajaran_id || null,
          tingkat: uploadForm.tingkat,
          link_url: uploadForm.link_url,
        });
      }
      setUploadModal(false);
      fetchData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setUploading(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError("");
    if (!editForm.judul.trim()) {
      setEditError("Judul wajib diisi");
      return;
    }
    if (editing.tipe === "link" && !editForm.link_url.trim()) {
      setEditError("URL link wajib diisi");
      return;
    }
    setUploading(true);
    try {
      await api.updateMateri(editing.id, {
        judul: editForm.judul,
        mata_pelajaran_id: editForm.mata_pelajaran_id || null,
        tingkat: editForm.tingkat,
        link_url: editing.tipe === "link" ? editForm.link_url : undefined,
      });
      setEditModal(false);
      fetchData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMateri(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (m: Materi) => {
    setDownloadingId(m.id);
    try {
      const token = getToken();
      const res = await fetch(api.getMateriDownloadUrl(m.id), {
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
      a.download = m.file_name;
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
        title="Materi Ajar"
        subtitle="Upload file materi (PPT, PDF, DOC) atau tambahkan link URL"
        actions={
          <button onClick={openUpload} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Materi
          </button>
        }
      />

      {/* Filter bar: search + tingkat filter */}
      <div className="card mb-4 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari materi..."
            className="input-field pl-10"
          />
        </div>
        <div className="relative sm:w-48">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={tingkatFilter}
            onChange={(e) => setTingkatFilter(e.target.value)}
            className="input-field pl-10"
          >
            <option value="">Semua Tingkat</option>
            {TINGKAT_OPTIONS.map((t) => (
              <option key={t} value={t}>Kelas {t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState
            title="Belum ada materi"
            subtitle="Klik 'Tambah Materi' untuk menambahkan file atau link pertama"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Judul</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tipe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tingkat</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mata Pelajaran</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Ukuran</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Diupload Oleh</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((m) => {
                  const isLink = m.tipe === "link";
                  const Icon = isLink ? LinkIcon : getFileIcon(m.file_name);
                  const colorClass = isLink ? "text-blue-500 bg-blue-50" : getFileColor(m.file_type, m.file_name);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-[200px]">{m.judul}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">
                              {isLink ? m.link_url : m.file_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${isLink ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                          {isLink ? "Link" : "File"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.tingkat ? (
                          <span className={`badge ${tingkatBadge[m.tingkat] || "bg-slate-100 text-slate-600"}`}>
                            {m.tingkat}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.mata_pelajaran?.nama || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {isLink ? "-" : formatSize(m.file_size)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{m.uploaded_by || "-"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        }) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isLink && m.link_url ? (
                            <a
                              href={m.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-icon hover:bg-blue-50"
                              title="Buka Link"
                            >
                              <LinkIcon className="w-4 h-4 text-blue-600" />
                            </a>
                          ) : (
                            <button
                              onClick={() => handleDownload(m)}
                              className="btn-icon hover:bg-teal-50"
                              title="Download"
                              disabled={downloadingId === m.id}
                            >
                              {downloadingId === m.id ? (
                                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 text-teal-600" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(m)}
                            className="btn-icon"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            className="btn-icon hover:bg-red-50"
                            title="Hapus"
                          >
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

      {/* Upload Modal */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Tambah Materi" size="lg">
        <form onSubmit={handleUpload} className="space-y-4">
          {/* Tipe selector */}
          <div>
            <label className="input-label">Tipe Materi *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setUploadForm({ ...uploadForm, tipe: "file" }); setUploadError(""); }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all ${
                  uploadForm.tipe === "file"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => { setUploadForm({ ...uploadForm, tipe: "link" }); setFile(null); setUploadError(""); }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all ${
                  uploadForm.tipe === "link"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Link URL</span>
              </button>
            </div>
          </div>

          {/* File drop zone (only for file type) */}
          {uploadForm.tipe === "file" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? "border-teal-500 bg-teal-50" : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ppt,.pptx,.pdf,.doc,.docx"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getFileColor(file.type, file.name)}`}>
                    {(() => {
                      const Icon = getFileIcon(file.name);
                      return <Icon className="w-6 h-6" />;
                    })()}
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
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Tarik file ke sini atau klik untuk memilih
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Format: PPT, PPTX, PDF, DOC, DOCX • Maks 50MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Link URL field (only for link type) */}
          {uploadForm.tipe === "link" && (
            <div>
              <label className="input-label">URL Link *</label>
              <input
                type="url"
                value={uploadForm.link_url}
                onChange={(e) => setUploadForm({ ...uploadForm, link_url: e.target.value })}
                className="input-field"
                placeholder="https://..."
                disabled={uploading}
              />
            </div>
          )}

          <div>
            <label className="input-label">Judul *</label>
            <input
              type="text"
              value={uploadForm.judul}
              onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
              className="input-field"
              placeholder="Judul materi..."
              disabled={uploading}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Tingkat</label>
              <select
                value={uploadForm.tingkat}
                onChange={(e) => setUploadForm({ ...uploadForm, tingkat: e.target.value })}
                className="input-field"
                disabled={uploading}
              >
                <option value="">Tanpa tingkat</option>
                {TINGKAT_OPTIONS.map((t) => (
                  <option key={t} value={t}>Kelas {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Mata Pelajaran</label>
              <select
                value={uploadForm.mata_pelajaran_id}
                onChange={(e) => setUploadForm({ ...uploadForm, mata_pelajaran_id: e.target.value })}
                className="input-field"
                disabled={uploading}
              >
                <option value="">Tanpa mata pelajaran</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {uploadError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setUploadModal(false)} className="btn-secondary" disabled={uploading}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={uploading || (uploadForm.tipe === "file" && !file)}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Materi">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="input-label">Judul *</label>
            <input
              type="text"
              value={editForm.judul}
              onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
              className="input-field"
              disabled={uploading}
            />
          </div>
          {editing?.tipe === "link" && (
            <div>
              <label className="input-label">URL Link *</label>
              <input
                type="url"
                value={editForm.link_url}
                onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })}
                className="input-field"
                placeholder="https://..."
                disabled={uploading}
              />
            </div>
          )}
          {editing?.tipe === "file" && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-500" />
              <span className="truncate">{editing.file_name}</span>
              <span className="text-xs text-slate-400">({formatSize(editing.file_size)})</span>
            </div>
          )}
          <div>
            <label className="input-label">Tingkat</label>
            <select
              value={editForm.tingkat}
              onChange={(e) => setEditForm({ ...editForm, tingkat: e.target.value })}
              className="input-field"
              disabled={uploading}
            >
              <option value="">Tanpa tingkat</option>
              {TINGKAT_OPTIONS.map((t) => (
                <option key={t} value={t}>Kelas {t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Mata Pelajaran</label>
            <select
              value={editForm.mata_pelajaran_id}
              onChange={(e) => setEditForm({ ...editForm, mata_pelajaran_id: e.target.value })}
              className="input-field"
              disabled={uploading}
            >
              <option value="">Tanpa mata pelajaran</option>
              {mapelList.map((m) => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
          </div>

          {editError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {editError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary" disabled={uploading}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {uploading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Materi"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.judul}"?`}
        loading={deleting}
      />
    </div>
  );
}
