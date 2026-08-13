import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { MataPelajaran } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Plus, Pencil, Trash2, Search, Loader2, BookMarked } from "lucide-react";

interface FormState {
  nama: string;
  kode: string;
  keterangan: string;
}

const emptyForm: FormState = { nama: "", kode: "", keterangan: "" };

export default function MataPelajaranManager() {
  const [data, setData] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MataPelajaran | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MataPelajaran | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .listMataPelajaran({ search })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (m: MataPelajaran) => {
    setEditing(m);
    setForm({ nama: m.nama, kode: m.kode || "", keterangan: m.keterangan || "" });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.nama.trim()) {
      setFormError("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateMataPelajaran(editing.id, form);
      } else {
        await api.createMataPelajaran(form);
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
      await api.deleteMataPelajaran(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Mata Pelajaran"
        subtitle="Kelola daftar mata pelajaran"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Mapel
          </button>
        }
      />

      <div className="card mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mata pelajaran..."
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada mata pelajaran" subtitle="Klik 'Tambah Mapel' untuk membuat data pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Kode</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Keterangan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      {m.nama}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{m.kode || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.keterangan || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="btn-icon" title="Edit">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Nama Mata Pelajaran *</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input-field"
              placeholder="contoh: Matematika"
              disabled={saving}
            />
          </div>
          <div>
            <label className="input-label">Kode</label>
            <input
              type="text"
              value={form.kode}
              onChange={(e) => setForm({ ...form, kode: e.target.value })}
              className="input-field"
              placeholder="contoh: MAT"
              disabled={saving}
            />
          </div>
          <div>
            <label className="input-label">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="input-field min-h-[70px] resize-y"
              placeholder="Keterangan singkat..."
              disabled={saving}
            />
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Mata Pelajaran"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.nama}"?`}
        loading={deleting}
      />
    </div>
  );
}
