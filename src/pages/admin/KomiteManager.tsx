import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { Komite, Siswa } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";

interface FormState {
  siswa_id: string;
  jenis_iuran: string;
  nominal: string;
  tanggal_bayar: string;
  status: string;
  keterangan: string;
}

const emptyForm: FormState = {
  siswa_id: "",
  jenis_iuran: "Bulanan",
  nominal: "0",
  tanggal_bayar: "",
  status: "Belum Lunas",
  keterangan: "",
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function KomiteManager() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [data, setData] = useState<Komite[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Komite | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Komite | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([api.listKomite({ search, tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester }), api.listSiswa()])
      .then(([komRes, siswaRes]) => {
        setData(komRes.data);
        setSiswaList(siswaRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, selectedTahunAjaranId, selectedSemester]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const siswaMap = new Map(siswaList.map((s) => [s.id, s]));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (k: Komite) => {
    setEditing(k);
    setForm({
      siswa_id: k.siswa_id,
      jenis_iuran: k.jenis_iuran,
      nominal: String(k.nominal),
      tanggal_bayar: k.tanggal_bayar || "",
      status: k.status,
      keterangan: k.keterangan,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.siswa_id || !form.jenis_iuran) {
      setFormError("Siswa dan jenis iuran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        siswa_id: form.siswa_id,
        jenis_iuran: form.jenis_iuran,
        nominal: parseFloat(form.nominal) || 0,
        tanggal_bayar: form.tanggal_bayar || null,
        status: form.status,
        keterangan: form.keterangan,
        tahun_ajaran_id: selectedTahunAjaranId || null,
        semester: selectedSemester,
      };
      if (editing) {
        await api.updateKomite(editing.id, payload);
      } else {
        await api.createKomite(payload);
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
      await api.deleteKomite(deleteTarget.id);
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
        title="Manajemen Komite"
        subtitle="Kelola iuran dan pembayaran komite siswa"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Komite
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
            placeholder="Cari data komite..."
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
          <EmptyState title="Belum ada data komite" subtitle="Klik 'Tambah Komite' untuk membuat data pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Siswa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jenis Iuran</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Nominal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tgl. Bayar</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((k) => {
                  const siswa = siswaMap.get(k.siswa_id);
                  return (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {siswa?.nama || "Siswa tidak ditemukan"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{k.jenis_iuran}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatRupiah(Number(k.nominal))}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {k.tanggal_bayar
                          ? new Date(k.tanggal_bayar).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            k.status === "Lunas"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Komite" : "Tambah Komite"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Siswa *</label>
            <select
              value={form.siswa_id}
              onChange={(e) => setForm({ ...form, siswa_id: e.target.value })}
              className="input-field"
              disabled={saving}
            >
              <option value="">Pilih siswa</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — {s.nisn}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Jenis Iuran *</label>
              <select
                value={form.jenis_iuran}
                onChange={(e) => setForm({ ...form, jenis_iuran: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="Bulanan">Bulanan</option>
                <option value="Tahunan">Tahunan</option>
                <option value="Bebas">Bebas</option>
                <option value="Kegiatan">Kegiatan</option>
              </select>
            </div>
            <div>
              <label className="input-label">Nominal (Rp) *</label>
              <input
                type="number"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                className="input-field"
                min="0"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Tanggal Bayar</label>
              <input
                type="date"
                value={form.tanggal_bayar}
                onChange={(e) => setForm({ ...form, tanggal_bayar: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="Belum Lunas">Belum Lunas</option>
                <option value="Lunas">Lunas</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Keterangan</label>
            <input
              type="text"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="input-field"
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
        title="Hapus Komite"
        message="Apakah Anda yakin ingin menghapus data komite ini?"
        loading={deleting}
      />
    </div>
  );
}
