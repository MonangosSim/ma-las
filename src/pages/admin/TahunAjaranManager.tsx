import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { TahunAjaran } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { Plus, Pencil, Trash2, Loader2, CalendarRange, CheckCircle2, Power } from "lucide-react";

const SEMESTER_OPTIONS = ["Ganjil", "Genap"];

export default function TahunAjaranManager() {
  const { refresh: refreshContext } = useTahunAjaran();
  const [data, setData] = useState<TahunAjaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TahunAjaran | null>(null);
  const [form, setForm] = useState({ nama: "", semester_aktif: "Ganjil" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TahunAjaran | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api.listTahunAjaran()
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nama: "", semester_aktif: "Ganjil" });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (t: TahunAjaran) => {
    setEditing(t);
    setForm({ nama: t.nama, semester_aktif: t.semester_aktif });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.nama.trim()) {
      setFormError("Nama tahun ajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateTahunAjaran(editing.id, { nama: form.nama, semester_aktif: form.semester_aktif });
      } else {
        await api.createTahunAjaran({ nama: form.nama, semester_aktif: form.semester_aktif });
      }
      setModalOpen(false);
      fetchData();
      refreshContext();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (t: TahunAjaran) => {
    setActivatingId(t.id);
    try {
      await api.setActiveTahunAjaran(t.id, t.semester_aktif);
      fetchData();
      refreshContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan");
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTahunAjaran(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
      refreshContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tahun Ajaran"
        subtitle="Kelola tahun ajaran dan semester aktif"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Tahun Ajaran
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada tahun ajaran" subtitle="Klik 'Tambah Tahun Ajaran' untuk membuat" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tahun Ajaran</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Semester Aktif</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Dibuat</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <CalendarRange className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="font-medium text-slate-900">{t.nama}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${t.semester_aktif === "Ganjil" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {t.semester_aktif}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.is_active ? (
                        <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      }) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!t.is_active && (
                          <button
                            onClick={() => handleActivate(t)}
                            className="btn-icon hover:bg-emerald-50"
                            title="Jadikan Aktif"
                            disabled={activatingId === t.id}
                          >
                            {activatingId === t.id ? (
                              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                        )}
                        <button onClick={() => openEdit(t)} className="btn-icon" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Nama Tahun Ajaran *</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input-field"
              placeholder="Contoh: 2025/2026"
              disabled={saving}
            />
          </div>
          <div>
            <label className="input-label">Semester Aktif</label>
            <select
              value={form.semester_aktif}
              onChange={(e) => setForm({ ...form, semester_aktif: e.target.value })}
              className="input-field"
              disabled={saving}
            >
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
        title="Hapus Tahun Ajaran"
        message={`Apakah Anda yakin ingin menghapus tahun ajaran "${deleteTarget?.nama}"? Data terkait mungkin terpengaruh.`}
        loading={deleting}
      />
    </div>
  );
}
