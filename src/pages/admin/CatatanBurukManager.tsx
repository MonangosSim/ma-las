import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { CatatanBuruk, Siswa, Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  CalendarDays,
  User,
} from "lucide-react";

interface FormState {
  siswa_id: string;
  tanggal: string;
  catatan: string;
}

const emptyForm: FormState = {
  siswa_id: "",
  tanggal: new Date().toISOString().split("T")[0],
  catatan: "",
};

export default function CatatanBurukManager() {
  const [data, setData] = useState<CatatanBuruk[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatatanBuruk | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CatatanBuruk | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.listCatatanBuruk({ search }),
      api.listSiswa({ kelas_id: kelasFilter }),
      api.listKelas(),
    ])
      .then(([catRes, siswaRes, kelasRes]) => {
        setData(catRes.data);
        setSiswaList(siswaRes.data);
        setKelasList(kelasRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, kelasFilter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const getSiswaNama = (id: string) => {
    const s = siswaList.find((s) => s.id === id);
    return s ? s.nama : data.find((d) => d.siswa_id === id)?.siswa?.nama || "-";
  };

  const getSiswaNisn = (id: string) => {
    const s = siswaList.find((s) => s.id === id);
    return s ? s.nisn : data.find((d) => d.siswa_id === id)?.siswa?.nisn || "";
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, siswa_id: kelasFilter ? "" : "" });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (c: CatatanBuruk) => {
    setEditing(c);
    setForm({
      siswa_id: c.siswa_id,
      tanggal: c.tanggal,
      catatan: c.catatan,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.siswa_id) {
      setFormError("Siswa wajib dipilih");
      return;
    }
    if (!form.tanggal) {
      setFormError("Tanggal wajib diisi");
      return;
    }
    if (!form.catatan.trim()) {
      setFormError("Catatan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateCatatanBuruk(editing.id, {
          siswa_id: form.siswa_id,
          tanggal: form.tanggal,
          catatan: form.catatan,
        });
      } else {
        await api.createCatatanBuruk({
          siswa_id: form.siswa_id,
          tanggal: form.tanggal,
          catatan: form.catatan,
        });
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
      await api.deleteCatatanBuruk(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const filteredSiswa = kelasFilter
    ? siswaList.filter((s) => s.kelas_id === kelasFilter)
    : siswaList;

  const filteredData = kelasFilter
    ? data.filter((d) => {
        const s = siswaList.find((s) => s.id === d.siswa_id);
        return s?.kelas_id === kelasFilter;
      })
    : data;

  return (
    <div>
      <PageHeader
        title="Catatan Buruk"
        subtitle="Catat pelanggaran atau catatan buruk siswa"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Catatan
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
            placeholder="Cari catatan..."
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
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredData.length === 0 ? (
          <EmptyState title="Belum ada catatan buruk" subtitle="Klik 'Tambah Catatan' untuk membuat catatan pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Siswa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Catatan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-red-500">
                          <User className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-[180px]">{getSiswaNama(c.siswa_id)}</p>
                          <p className="text-xs text-slate-400">{getSiswaNisn(c.siswa_id)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(c.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-700 line-clamp-2 max-w-[320px]">{c.catatan}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="btn-icon" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="btn-icon hover:bg-red-50" title="Hapus">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Catatan Buruk" : "Tambah Catatan Buruk"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Siswa *</label>
            <select
              value={form.siswa_id}
              onChange={(e) => setForm({ ...form, siswa_id: e.target.value })}
              className="input-field"
              disabled={saving}
            >
              <option value="">Pilih Siswa</option>
              {filteredSiswa.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — {s.nisn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Tanggal *</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="input-field"
              disabled={saving}
            />
          </div>
          <div>
            <label className="input-label">Catatan *</label>
            <textarea
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="Tuliskan catatan buruk siswa..."
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Catatan Buruk"
        message={`Apakah Anda yakin ingin menghapus catatan untuk "${getSiswaNama(deleteTarget?.siswa_id || "")}"?`}
        loading={deleting}
      />
    </div>
  );
}
