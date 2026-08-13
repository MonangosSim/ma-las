import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Plus, Pencil, Trash2, Search, School, Loader2 } from "lucide-react";

interface FormState {
  nama_kelas: string;
  tingkat: string;
  jurusan: string;
  wali_kelas: string;
}

const emptyForm: FormState = {
  nama_kelas: "",
  tingkat: "",
  jurusan: "",
  wali_kelas: "",
};

export default function KelasManager() {
  const [data, setData] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Kelas | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Kelas | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .listKelas({ search })
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

  const openEdit = (k: Kelas) => {
    setEditing(k);
    setForm({
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat,
      jurusan: k.jurusan,
      wali_kelas: k.wali_kelas,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.nama_kelas.trim() || !form.tingkat.trim()) {
      setFormError("Nama kelas dan tingkat wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateKelas(editing.id, form);
      } else {
        await api.createKelas(form);
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
      await api.deleteKelas(deleteTarget.id);
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
        title="Manajemen Kelas"
        subtitle="Kelola data kelas dan wali kelas"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Kelas
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
            placeholder="Cari nama kelas atau wali kelas..."
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
          <EmptyState title="Belum ada data kelas" subtitle="Klik 'Tambah Kelas' untuk membuat data pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Nama Kelas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tingkat</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jurusan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Wali Kelas</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                          <School className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="font-medium text-slate-900">{k.nama_kelas}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{k.tingkat}</td>
                    <td className="px-4 py-3 text-slate-600">{k.jurusan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{k.wali_kelas || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(k)} className="btn-icon" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(k)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Kelas" : "Tambah Kelas"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nama Kelas *</label>
              <input
                type="text"
                value={form.nama_kelas}
                onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })}
                className="input-field"
                placeholder="contoh: X IPA 1"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Tingkat *</label>
              <select
                value={form.tingkat}
                onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="">Pilih tingkat</option>
                <option value="VII">VII</option>
                <option value="VIII">VIII</option>
                <option value="IX">IX</option>
                <option value="X">X</option>
                <option value="XI">XI</option>
                <option value="XII">XII</option>
              </select>
            </div>
            <div>
              <label className="input-label">Jurusan</label>
              <input
                type="text"
                value={form.jurusan}
                onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                className="input-field"
                placeholder="contoh: IPA"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Wali Kelas</label>
              <input
                type="text"
                value={form.wali_kelas}
                onChange={(e) => setForm({ ...form, wali_kelas: e.target.value })}
                className="input-field"
                placeholder="Nama wali kelas"
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
        title="Hapus Kelas"
        message={`Apakah Anda yakin ingin menghapus kelas "${deleteTarget?.nama_kelas}"?`}
        loading={deleting}
      />
    </div>
  );
}
