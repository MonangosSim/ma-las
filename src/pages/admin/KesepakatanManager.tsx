import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { KesepakatanKelas, Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { Plus, Pencil, Trash2, Search, Loader2, ScrollText, CalendarDays } from "lucide-react";

export default function KesepakatanManager() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [data, setData] = useState<KesepakatanKelas[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KesepakatanKelas | null>(null);
  const [form, setForm] = useState({ kelas_id: "", judul: "", isi: "", tanggal_dibuat: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<KesepakatanKelas | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.listKesepakatanKelas({ search, kelas_id: kelasFilter, tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester }),
      api.listKelas(),
    ])
      .then(([res, kelasRes]) => {
        setData(res.data);
        setKelasList(kelasRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, kelasFilter, selectedTahunAjaranId, selectedSemester]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ kelas_id: kelasFilter || "", judul: "", isi: "", tanggal_dibuat: new Date().toISOString().split("T")[0] });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (k: KesepakatanKelas) => {
    setEditing(k);
    setForm({ kelas_id: k.kelas_id, judul: k.judul, isi: k.isi, tanggal_dibuat: k.tanggal_dibuat });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.kelas_id) { setFormError("Kelas wajib dipilih"); return; }
    if (!form.judul.trim()) { setFormError("Judul wajib diisi"); return; }
    if (!form.isi.trim()) { setFormError("Isi kesepakatan wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = {
        kelas_id: form.kelas_id,
        judul: form.judul,
        isi: form.isi,
        tanggal_dibuat: form.tanggal_dibuat,
        tahun_ajaran_id: selectedTahunAjaranId || undefined,
        semester: selectedSemester,
      };
      if (editing) {
        await api.updateKesepakatanKelas(editing.id, payload);
      } else {
        await api.createKesepakatanKelas(payload);
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
      await api.deleteKesepakatanKelas(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const getKelasNama = (id: string) => kelasList.find((k) => k.id === id)?.nama_kelas || "-";

  return (
    <div>
      <PageHeader
        title="Kesepakatan Kelas"
        subtitle="Catat kesepakatan kelas untuk setiap kelas per tahun ajaran & semester"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Kesepakatan
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Cari kesepakatan..."
          />
        </div>
        <select value={kelasFilter} onChange={(e) => setKelasFilter(e.target.value)} className="input-field sm:w-48">
          <option value="">Semua Kelas</option>
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada kesepakatan kelas" subtitle="Klik 'Tambah Kesepakatan' untuk membuat" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Kelas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Judul</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">Isi</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="badge bg-teal-100 text-teal-700">{getKelasNama(k.kelas_id)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-900">{k.judul}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(k.tanggal_dibuat).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      <p className="line-clamp-2 max-w-md">{k.isi}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(k)} className="btn-icon" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(k)} className="btn-icon hover:bg-red-50" title="Hapus">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Kesepakatan Kelas" : "Tambah Kesepakatan Kelas"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Kelas *</label>
            <select value={form.kelas_id} onChange={(e) => setForm({ ...form, kelas_id: e.target.value })} className="input-field" disabled={saving}>
              <option value="">Pilih Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Judul *</label>
            <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="input-field" placeholder="Contoh: Kesepakatan Belajar" disabled={saving} />
          </div>
          <div>
            <label className="input-label">Tanggal Dibuat *</label>
            <input type="date" value={form.tanggal_dibuat} onChange={(e) => setForm({ ...form, tanggal_dibuat: e.target.value })} className="input-field" disabled={saving} />
          </div>
          <div>
            <label className="input-label">Isi Kesepakatan *</label>
            <textarea value={form.isi} onChange={(e) => setForm({ ...form, isi: e.target.value })} className="input-field min-h-[120px] resize-y" placeholder="Tuliskan isi kesepakatan kelas..." disabled={saving} />
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
        title="Hapus Kesepakatan Kelas"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.judul}"?`}
        loading={deleting}
      />
    </div>
  );
}
