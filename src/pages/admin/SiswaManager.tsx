import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { Siswa, Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Plus, Pencil, Trash2, Search, Loader2, RotateCcw, Upload, KeyRound } from "lucide-react";
import SiswaImportModal from "../../components/SiswaImportModal";

interface FormState {
  nisn: string;
  nama: string;
  kelas_id: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  nama_ortu: string;
  no_hp_ortu: string;
  password_1: string;
  password_2: string;
}

const emptyForm: FormState = {
  nisn: "",
  nama: "",
  kelas_id: "",
  jenis_kelamin: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  alamat: "",
  nama_ortu: "",
  no_hp_ortu: "",
  password_1: "",
  password_2: "",
};

export default function SiswaManager() {
  const [data, setData] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Siswa | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<Siswa | null>(null);
  const [resetting, setResetting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [ortuPwTarget, setOrtuPwTarget] = useState<Siswa | null>(null);
  const [ortuPwValue, setOrtuPwValue] = useState("");
  const [ortuPwSaving, setOrtuPwSaving] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.listSiswa({ search, kelas_id: kelasFilter }),
      api.listKelas(),
    ])
      .then(([siswaRes, kelasRes]) => {
        setData(siswaRes.data);
        setKelasList(kelasRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, kelasFilter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const kelasMap = new Map(kelasList.map((k) => [k.id, k]));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (s: Siswa) => {
    setEditing(s);
    setForm({
      nisn: s.nisn,
      nama: s.nama,
      kelas_id: s.kelas_id || "",
      jenis_kelamin: s.jenis_kelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir || "",
      alamat: s.alamat,
      nama_ortu: s.nama_ortu,
      no_hp_ortu: s.no_hp_ortu,
      password_1: "",
      password_2: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.nisn.trim() || !form.nama.trim()) {
      setFormError("NISN dan nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        kelas_id: form.kelas_id || null,
        tanggal_lahir: form.tanggal_lahir || null,
      };
      if (editing) {
        await api.updateSiswa(editing.id, payload);
      } else {
        await api.createSiswa(payload);
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
      await api.deleteSiswa(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await api.resetSiswaPassword(resetTarget.id, resetTarget.nisn);
      setResetTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal reset password");
    } finally {
      setResetting(false);
    }
  };

  const openOrtuPwModal = (s: Siswa) => {
    setOrtuPwTarget(s);
    setOrtuPwValue("");
  };

  const handleSaveOrtuPw = async () => {
    if (!ortuPwTarget) return;
    if (!ortuPwValue.trim()) {
      setError("Password orang tua wajib diisi");
      return;
    }
    setOrtuPwSaving(true);
    try {
      await api.setSiswaOrtuPassword(ortuPwTarget.id, ortuPwValue.trim());
      setOrtuPwTarget(null);
      setOrtuPwValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan password orang tua");
    } finally {
      setOrtuPwSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Manajemen Siswa"
        subtitle="Kelola data siswa dan akun login siswa"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setImportOpen(true)} className="btn-secondary">
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          </div>
        }
      />

      <div className="card mb-4 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NISN..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={kelasFilter}
          onChange={(e) => setKelasFilter(e.target.value)}
          className="input-field sm:w-56"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama_kelas}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada data siswa" subtitle="Klik 'Tambah Siswa' untuk membuat data pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Siswa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">NISN</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Kelas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">L/P</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Orang Tua</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-700">
                          {s.nama.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{s.nama}</span>
                        {s.pwd_is_default === false && (
                          <span className="badge bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5" title="Password siswa sudah diubah dari default (NISN)">
                            pwd diubah
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{s.nisn}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.kelas_id ? kelasMap.get(s.kelas_id)?.nama_kelas || "-" : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.jenis_kelamin === "L" ? "Laki-laki" : s.jenis_kelamin === "P" ? "Perempuan" : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{s.nama_ortu || "-"}</div>
                      {s.no_hp_ortu && <div className="text-xs text-slate-400">{s.no_hp_ortu}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setResetTarget(s)}
                          className="btn-icon hover:bg-amber-50"
                          title="Reset Password Siswa (Password_1)"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-600" />
                        </button>
                        <button
                          onClick={() => openOrtuPwModal(s)}
                          className="btn-icon hover:bg-violet-50"
                          title="Atur Password Orang Tua (Password_2)"
                        >
                          <KeyRound className="w-4 h-4 text-violet-600" />
                        </button>
                        <button onClick={() => openEdit(s)} className="btn-icon" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Siswa" : "Tambah Siswa"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">NISN *</label>
              <input
                type="text"
                value={form.nisn}
                onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                className="input-field"
                placeholder="Nomor Induk Siswa Nasional"
                disabled={saving}
              />
              {!editing && (
                <p className="text-xs text-slate-400 mt-1">
                  Password awal akan diatur menggunakan NISN
                </p>
              )}
            </div>
            <div>
              <label className="input-label">Nama Lengkap *</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="input-field"
                placeholder="Nama lengkap siswa"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Kelas</label>
              <select
                value={form.kelas_id}
                onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="">Pilih kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Jenis Kelamin</label>
              <select
                value={form.jenis_kelamin}
                onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="">Pilih</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="input-label">Tempat Lahir</label>
              <input
                type="text"
                value={form.tempat_lahir}
                onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Tanggal Lahir</label>
              <input
                type="date"
                value={form.tanggal_lahir}
                onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="input-label">Alamat</label>
              <input
                type="text"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Nama Orang Tua</label>
              <input
                type="text"
                value={form.nama_ortu}
                onChange={(e) => setForm({ ...form, nama_ortu: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">No. HP Orang Tua</label>
              <input
                type="text"
                value={form.no_hp_ortu}
                onChange={(e) => setForm({ ...form, no_hp_ortu: e.target.value })}
                className="input-field"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Password Siswa (Password_1)</label>
              <input
                type="text"
                value={form.password_1}
                onChange={(e) => setForm({ ...form, password_1: e.target.value })}
                placeholder={editing ? "Kosongkan = tidak ubah" : "Default = NISN"}
                className="input-field"
                disabled={saving}
              />
              <p className="text-xs text-slate-400 mt-1">
                Password untuk login sebagai siswa. Jika kosong, default = NISN.
              </p>
            </div>
            <div>
              <label className="input-label">Password Orang Tua (Password_2)</label>
              <input
                type="text"
                value={form.password_2}
                onChange={(e) => setForm({ ...form, password_2: e.target.value })}
                placeholder="Kosongkan = tidak ubah"
                className="input-field"
                disabled={saving}
              />
              <p className="text-xs text-slate-400 mt-1">
                Password untuk login sebagai orang tua. Jika kosong, tidak diubah.
              </p>
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
        title="Hapus Siswa"
        message={`Apakah Anda yakin ingin menghapus siswa "${deleteTarget?.nama}"? Semua data absensi, komite, dan nilai terkait juga akan dihapus.`}
        loading={deleting}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={handleResetPassword}
        title="Reset Password Siswa"
        message={`Password siswa "${resetTarget?.nama}" akan direset ke NISN: ${resetTarget?.nisn}. Siswa dapat login kembali dengan NISN sebagai username dan password.`}
        confirmLabel="Reset"
        loading={resetting}
      />

      <SiswaImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        kelasList={kelasList}
        onSuccess={fetchData}
      />

      <Modal
        open={!!ortuPwTarget}
        onClose={() => { setOrtuPwTarget(null); setOrtuPwValue(""); }}
        title="Atur Password Orang Tua (Password_2)"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Password ini digunakan oleh orang tua/wali siswa{" "}
            <span className="font-semibold text-slate-900">{ortuPwTarget?.nama}</span> untuk login.
            Saat login, sistem akan memeriksa password siswa (Password_1) terlebih dahulu.
            Jika tidak cocok, sistem akan memeriksa password orang tua (Password_2).
          </p>
          <div>
            <label className="form-label">Password Orang Tua</label>
            <input
              type="text"
              value={ortuPwValue}
              onChange={(e) => setOrtuPwValue(e.target.value)}
              placeholder="Masukkan password untuk orang tua"
              className="form-input"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">
              Tip: bisa sama dengan NISN atau password lain yang dibagikan ke orang tua.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => { setOrtuPwTarget(null); setOrtuPwValue(""); }}
              className="btn-secondary"
              disabled={ortuPwSaving}
            >
              Batal
            </button>
            <button
              onClick={handleSaveOrtuPw}
              className="btn-primary"
              disabled={ortuPwSaving || !ortuPwValue.trim()}
            >
              {ortuPwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {ortuPwSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
