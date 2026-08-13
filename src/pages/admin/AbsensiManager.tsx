import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../api";
import type { Absensi, Siswa, Kelas, AbsensiBatchEntry } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  CalendarCheck,
  BookOpen,
  Save,
  Users,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";

const statusColors: Record<string, string> = {
  Hadir: "bg-emerald-100 text-emerald-700",
  Sakit: "bg-amber-100 text-amber-700",
  Izin: "bg-blue-100 text-blue-700",
  Alpa: "bg-rose-100 text-rose-700",
};

const statusSelectColors: Record<string, string> = {
  Hadir: "text-emerald-700 font-medium",
  Sakit: "text-amber-700 font-medium",
  Izin: "text-blue-700 font-medium",
  Alpa: "text-rose-700 font-medium",
};

interface BatchEntry extends AbsensiBatchEntry {
  nama: string;
  nisn: string;
}

export default function AbsensiManager() {
  const { selectedTahunAjaranId, selectedSemester, tahunAjaranList } = useTahunAjaran();
  const tahunAjaranMap = new Map(tahunAjaranList.map((t) => [t.id, t.nama]));
  const [tab, setTab] = useState<"input" | "riwayat" | "rekap">("input");

  // ============================================================
  // Shared data
  // ============================================================
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // Batch input state
  // ============================================================
  const [batchKelas, setBatchKelas] = useState("");
  const [batchTanggal, setBatchTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [materiAjar, setMateriAjar] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [hasLoadedBatch, setHasLoadedBatch] = useState(false);

  // ============================================================
  // Riwayat state
  // ============================================================
  const [riwayatData, setRiwayatData] = useState<Absensi[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");
  const [editing, setEditing] = useState<Absensi | null>(null);
  const [editStatus, setEditStatus] = useState("Hadir");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [editMateriAjar, setEditMateriAjar] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Absensi | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============================================================
  // Rekap state
  // ============================================================
  const [rekapKelas, setRekapKelas] = useState("");
  const [rekapData, setRekapData] = useState<Absensi[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekapError, setRekapError] = useState("");

  // ============================================================
  // Initial load: kelas + siswa
  // ============================================================
  const loadInitial = useCallback(() => {
    setLoading(true);
    Promise.all([api.listKelas(), api.listSiswa()])
      .then(([kelasRes, siswaRes]) => {
        setKelasList(kelasRes.data);
        setSiswaList(siswaRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const siswaMap = new Map(siswaList.map((s) => [s.id, s]));
  const kelasMap = new Map(kelasList.map((k) => [k.id, k]));

  // ============================================================
  // Batch: load students for selected kelas + tanggal
  // ============================================================
  const loadBatch = async () => {
    if (!batchKelas || !batchTanggal) return;
    setBatchLoading(true);
    setBatchError("");
    setBatchSuccess(false);
    setHasLoadedBatch(true);
    try {
      const siswaInKelas = siswaList
        .filter((s) => s.kelas_id === batchKelas)
        .sort((a, b) => a.nama.localeCompare(b.nama));

      // Check if absensi already exists for this kelas+tanggal
      const batchRes = await api.getAbsensiBatch(batchKelas, batchTanggal);
      const existingMap = new Map(batchRes.entries.map((e) => [e.siswa_id, e]));
      setMateriAjar(batchRes.materi_ajar || "");

      const entries: BatchEntry[] = siswaInKelas.map((s) => {
        const existing = existingMap.get(s.id);
        return {
          siswa_id: s.id,
          nama: s.nama,
          nisn: s.nisn,
          status: existing?.status || "Hadir",
          keterangan: existing?.keterangan || "",
          existing_id: existing?.existing_id,
        };
      });

      setBatchEntries(entries);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setBatchLoading(false);
    }
  };

  const updateEntryStatus = (siswaId: string, status: string) => {
    setBatchEntries((prev) =>
      prev.map((e) => (e.siswa_id === siswaId ? { ...e, status } : e)),
    );
  };

  const updateEntryKeterangan = (siswaId: string, keterangan: string) => {
    setBatchEntries((prev) =>
      prev.map((e) => (e.siswa_id === siswaId ? { ...e, keterangan } : e)),
    );
  };

  const handleBatchSave = async () => {
    if (!batchKelas || !batchTanggal || batchEntries.length === 0) return;
    setBatchSaving(true);
    setBatchError("");
    setBatchSuccess(false);
    try {
      await api.saveAbsensiBatch(batchKelas, batchTanggal, materiAjar, batchEntries, selectedTahunAjaranId, selectedSemester);
      setBatchSuccess(true);
      setTimeout(() => setBatchSuccess(false), 3000);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBatchSaving(false);
    }
  };

  // ============================================================
  // Riwayat: load list
  // ============================================================
  const loadRiwayat = useCallback(() => {
    setRiwayatLoading(true);
    api
      .listAbsensi({ search, kelas_id: kelasFilter, tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((res) => setRiwayatData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setRiwayatLoading(false));
  }, [search, kelasFilter, selectedTahunAjaranId, selectedSemester]);

  useEffect(() => {
    if (tab === "riwayat") {
      const t = setTimeout(loadRiwayat, 300);
      return () => clearTimeout(t);
    }
  }, [tab, loadRiwayat]);

  // ============================================================
  // Rekap: load absensi for selected kelas
  // ============================================================
  const loadRekap = useCallback(() => {
    if (!rekapKelas) {
      setRekapData([]);
      return;
    }
    setRekapLoading(true);
    setRekapError("");
    api
      .listAbsensi({ kelas_id: rekapKelas, tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((res) => setRekapData(res.data))
      .catch((e) => setRekapError(e.message))
      .finally(() => setRekapLoading(false));
  }, [rekapKelas, selectedTahunAjaranId, selectedSemester]);

  useEffect(() => {
    if (tab === "rekap") {
      const t = setTimeout(loadRekap, 300);
      return () => clearTimeout(t);
    }
  }, [tab, loadRekap]);

  const openEdit = (a: Absensi) => {
    setEditing(a);
    setEditStatus(a.status);
    setEditKeterangan(a.keterangan || "");
    setEditMateriAjar(a.materi_ajar || "");
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editing) return;
    setEditSaving(true);
    setEditError("");
    try {
      await api.updateAbsensi(editing.id, {
        status: editStatus,
        keterangan: editKeterangan,
        materi_ajar: editMateriAjar,
      });
      setEditing(null);
      loadRiwayat();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAbsensi(deleteTarget.id);
      setDeleteTarget(null);
      loadRiwayat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error && kelasList.length === 0) return <ErrorState message={error} />;

  const selectedKelas = batchKelas ? kelasMap.get(batchKelas) : null;
  const hadirCount = batchEntries.filter((e) => e.status === "Hadir").length;
  const tidakHadirCount = batchEntries.length - hadirCount;

  return (
    <div>
      <PageHeader title="Manajemen Absensi" subtitle="Input kehadiran siswa per kelas dan riwayat absensi" />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setTab("input")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "input" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Input Absensi
        </button>
        <button
          onClick={() => setTab("riwayat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "riwayat" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Riwayat Absensi
        </button>
        <button
          onClick={() => setTab("rekap")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "rekap" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Rekap Absensi
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB: Input Absensi (batch mode) */}
      {/* ============================================================ */}
      {tab === "input" && (
        <div className="space-y-4 animate-fade-in">
          {/* Step 1: Select kelas + tanggal */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
              Pilih Kelas dan Tanggal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Kelas *</label>
                <select
                  value={batchKelas}
                  onChange={(e) => {
                    setBatchKelas(e.target.value);
                    setBatchEntries([]);
                    setHasLoadedBatch(false);
                  }}
                  className="input-field"
                  disabled={batchLoading}
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
                <label className="input-label">Tanggal *</label>
                <input
                  type="date"
                  value={batchTanggal}
                  onChange={(e) => {
                    setBatchTanggal(e.target.value);
                    setBatchEntries([]);
                    setHasLoadedBatch(false);
                  }}
                  className="input-field"
                  disabled={batchLoading}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadBatch}
                  disabled={!batchKelas || !batchTanggal || batchLoading}
                  className="btn-primary w-full"
                >
                  {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {batchLoading ? "Memuat..." : "Tampilkan Siswa"}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Daftar siswa + input absensi */}
          {hasLoadedBatch && (
            <div className="card overflow-hidden animate-slide-up">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
                    Daftar Kehadiran Siswa
                  </h3>
                  {selectedKelas && (
                    <p className="text-xs text-slate-500 mt-1 ml-8">
                      {selectedKelas.nama_kelas} • {new Date(batchTanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                {batchEntries.length > 0 && (
                  <div className="flex gap-4 text-xs ml-8 sm:ml-0">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hadir: {hadirCount}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-400" /> Tidak Hadir: {tidakHadirCount}
                    </span>
                  </div>
                )}
              </div>

              {batchLoading ? (
                <LoadingState />
              ) : batchEntries.length === 0 ? (
                <EmptyState title="Tidak ada siswa" subtitle="Kelas yang dipilih belum memiliki siswa terdaftar" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-3 font-semibold text-slate-700 w-10">No</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">Nama Siswa</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">NISN</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[140px]">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchEntries.map((entry, idx) => (
                        <tr key={entry.siswa_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{entry.nama}</td>
                          <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{entry.nisn}</td>
                          <td className="px-4 py-2.5">
                            <select
                              value={entry.status}
                              onChange={(e) => updateEntryStatus(entry.siswa_id, e.target.value)}
                              className={`input-field py-1.5 text-sm ${statusSelectColors[entry.status] || ""}`}
                              disabled={batchSaving}
                            >
                              <option value="Hadir">Hadir</option>
                              <option value="Sakit">Sakit</option>
                              <option value="Izin">Izin</option>
                              <option value="Alpa">Alpa</option>
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              value={entry.keterangan}
                              onChange={(e) => updateEntryKeterangan(entry.siswa_id, e.target.value)}
                              className="input-field py-1.5 text-sm"
                              placeholder={entry.status === "Hadir" ? "" : "Alasan/keterangan..."}
                              disabled={batchSaving || entry.status === "Hadir"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Step 3: Materi Ajar + Save */}
              {batchEntries.length > 0 && !batchLoading && (
                <div className="border-t border-slate-200 p-5 space-y-4 bg-slate-50/50">
                  <div>
                    <label className="input-label flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-teal-600" />
                      Materi Ajar / Jurnal Mengajar
                    </label>
                    <textarea
                      value={materiAjar}
                      onChange={(e) => setMateriAjar(e.target.value)}
                      className="input-field min-h-[80px] resize-y"
                      placeholder="Catat materi yang diajarkan pada sesi ini..."
                      disabled={batchSaving}
                    />
                  </div>

                  {batchError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                      {batchError}
                    </div>
                  )}

                  {batchSuccess && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-700 flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      Data absensi berhasil disimpan untuk {selectedKelas?.nama_kelas} pada {new Date(batchTanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}.
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button onClick={handleBatchSave} disabled={batchSaving} className="btn-primary">
                      {batchSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {batchSaving ? "Menyimpan..." : "Simpan Absensi"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasLoadedBatch && (
            <div className="card p-10">
              <EmptyState
                title="Pilih kelas dan tanggal untuk memulai"
                subtitle="Daftar siswa akan muncul setelah Anda memilih kelas dan menekan 'Tampilkan Siswa'"
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Riwayat Absensi */}
      {/* ============================================================ */}
      {tab === "riwayat" && (
        <div className="animate-fade-in">
          <div className="card mb-4 p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari data absensi..."
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
            {riwayatLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} />
            ) : riwayatData.length === 0 ? (
              <EmptyState title="Belum ada data absensi" subtitle="Gunakan tab 'Input Absensi' untuk mencatat kehadiran" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Siswa</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Kelas</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Keterangan</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riwayatData.map((a) => {
                      const siswa = siswaMap.get(a.siswa_id);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {siswa?.nama || "Siswa tidak ditemukan"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {a.kelas_id ? kelasMap.get(a.kelas_id)?.nama_kelas || "-" : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(a.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${statusColors[a.status] || "bg-slate-100 text-slate-700"}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={a.keterangan || ""}>
                            {a.keterangan || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEdit(a)} className="btn-icon" title="Edit">
                                <Pencil className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(a)}
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
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Rekap Absensi (pivot table) */}
      {/* ============================================================ */}
      {tab === "rekap" && (
        <div className="animate-fade-in space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
              Pilih Kelas untuk Rekap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Kelas *</label>
                <select
                  value={rekapKelas}
                  onChange={(e) => setRekapKelas(e.target.value)}
                  className="input-field"
                  disabled={rekapLoading}
                >
                  <option value="">Pilih kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="input-field bg-slate-50 text-slate-600 flex items-center gap-2 w-full">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <span className="font-medium text-sm">{selectedSemester} — {tahunAjaranMap.get(selectedTahunAjaranId) || "Belum dipilih"}</span>
                </div>
              </div>
            </div>
          </div>

          {rekapKelas && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
                  Rekap Kehadiran Siswa
                </h3>
                {rekapKelas && (
                  <p className="text-xs text-slate-500 mt-1 ml-8">
                    {kelasMap.get(rekapKelas)?.nama_kelas} • {selectedSemester} • {tahunAjaranMap.get(selectedTahunAjaranId) || ""}
                  </p>
                )}
              </div>

              {rekapLoading ? (
                <LoadingState />
              ) : rekapError ? (
                <ErrorState message={rekapError} />
              ) : !rekapKelas ? (
                <EmptyState title="Pilih kelas" subtitle="Pilih kelas untuk melihat rekap absensi" />
              ) : rekapData.length === 0 ? (
                <EmptyState title="Belum ada data absensi" subtitle="Belum ada data absensi untuk kelas dan periode ini" />
              ) : (
                <RekapTable
                  rekapData={rekapData}
                  siswaInKelas={siswaList.filter((s) => s.kelas_id === rekapKelas).sort((a, b) => a.nama.localeCompare(b.nama))}
                />
              )}
            </div>
          )}

          {!rekapKelas && (
            <div className="card p-10">
              <EmptyState
                title="Pilih kelas untuk melihat rekap"
                subtitle="Tabel rekap kehadiran akan menampilkan daftar siswa dan status kehadiran per tanggal"
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Edit Modal */}
      {/* ============================================================ */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in scrollbar-thin">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit Absensi</h3>
              <button onClick={() => setEditing(null)} className="btn-icon">
                <Plus className="w-5 h-5 text-slate-500 rotate-45" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-slate-50 px-3.5 py-3 text-sm">
                <p className="font-medium text-slate-900">{siswaMap.get(editing.siswa_id)?.nama || "Siswa"}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editing.kelas_id ? kelasMap.get(editing.kelas_id)?.nama_kelas : ""} •{" "}
                  {new Date(editing.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input-field"
                    disabled={editSaving}
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Keterangan</label>
                  <input
                    type="text"
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    className="input-field"
                    placeholder="Alasan/keterangan..."
                    disabled={editSaving}
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Materi Ajar</label>
                <textarea
                  value={editMateriAjar}
                  onChange={(e) => setEditMateriAjar(e.target.value)}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="Materi yang diajarkan..."
                  disabled={editSaving}
                />
              </div>

              {editError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditing(null)} className="btn-secondary" disabled={editSaving}>
                  Batal
                </button>
                <button onClick={handleEditSave} className="btn-primary" disabled={editSaving}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Absensi"
        message="Apakah Anda yakin ingin menghapus data absensi ini?"
        loading={deleting}
      />
    </div>
  );
}

// ============================================================
// RekapTable: pivot table siswa x tanggal
// ============================================================
function RekapTable({ rekapData, siswaInKelas }: { rekapData: Absensi[]; siswaInKelas: Siswa[] }) {
  const statusColors: Record<string, string> = {
    Hadir: "bg-emerald-100 text-emerald-700",
    Sakit: "bg-amber-100 text-amber-700",
    Izin: "bg-blue-100 text-blue-700",
    Alpa: "bg-rose-100 text-rose-700",
  };
  const statusShort: Record<string, string> = {
    Hadir: "H",
    Sakit: "S",
    Izin: "I",
    Alpa: "A",
  };

  // Build sorted unique dates
  const dates = useMemo(() => {
    const set = new Set<string>();
    rekapData.forEach((a) => set.add(a.tanggal));
    return Array.from(set).sort();
  }, [rekapData]);

  // Build map: siswa_id -> tanggal -> status
  const cellMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    rekapData.forEach((a) => {
      if (!map.has(a.siswa_id)) map.set(a.siswa_id, new Map());
      map.get(a.siswa_id)!.set(a.tanggal, a.status);
    });
    return map;
  }, [rekapData]);

  // Summary per siswa
  const summary = useMemo(() => {
    const map = new Map<string, { H: number; S: number; I: number; A: number; total: number }>();
    siswaInKelas.forEach((s) => {
      const inner = cellMap.get(s.id);
      const counts = { H: 0, S: 0, I: 0, A: 0, total: 0 };
      if (inner) {
        inner.forEach((status) => {
          counts.total++;
          if (status === "Hadir") counts.H++;
          else if (status === "Sakit") counts.S++;
          else if (status === "Izin") counts.I++;
          else if (status === "Alpa") counts.A++;
        });
      }
      map.set(s.id, counts);
    });
    return map;
  }, [siswaInKelas, cellMap]);

  const formatDateShort = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  };
  const formatDateFull = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };

  if (siswaInKelas.length === 0) {
    return <EmptyState title="Tidak ada siswa" subtitle="Belum ada siswa terdaftar di kelas ini" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[180px] border-b border-slate-200">
              Nama Siswa
            </th>
            {dates.map((d) => (
              <th
                key={d}
                className="text-center px-2 py-3 font-semibold text-slate-600 min-w-[50px] border-b border-slate-200"
                title={formatDateFull(d)}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-slate-400">
                    {new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short" }).charAt(0)}
                  </span>
                  <span>{formatDateShort(d)}</span>
                </div>
              </th>
            ))}
            <th className="text-center px-2 py-3 font-semibold text-emerald-700 min-w-[50px] bg-emerald-50 border-b border-slate-200">H</th>
            <th className="text-center px-2 py-3 font-semibold text-amber-700 min-w-[50px] bg-amber-50 border-b border-slate-200">S</th>
            <th className="text-center px-2 py-3 font-semibold text-blue-700 min-w-[50px] bg-blue-50 border-b border-slate-200">I</th>
            <th className="text-center px-2 py-3 font-semibold text-rose-700 min-w-[50px] bg-rose-50 border-b border-slate-200">A</th>
            <th className="text-center px-3 py-3 font-semibold text-teal-700 min-w-[70px] bg-teal-50 border-b border-slate-200">% Hadir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {siswaInKelas.map((s) => {
            const inner = cellMap.get(s.id);
            const counts = summary.get(s.id)!;
            return (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-700">
                      {s.nama.charAt(0).toUpperCase()}
                    </div>
                    <span>{s.nama}</span>
                  </div>
                </td>
                {dates.map((d) => {
                  const status = inner?.get(d);
                  if (!status) {
                    return <td key={d} className="text-center px-2 py-2.5 text-slate-300">—</td>;
                  }
                  return (
                    <td key={d} className="text-center px-2 py-2.5" title={`${formatDateFull(d)}: ${status}`}>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${statusColors[status] || "bg-slate-100 text-slate-500"}`}>
                        {statusShort[status] || "?"}
                      </span>
                    </td>
                  );
                })}
                <td className="text-center px-2 py-2.5 bg-emerald-50/50">
                  <span className="text-sm font-semibold text-emerald-700">{counts.H}</span>
                </td>
                <td className="text-center px-2 py-2.5 bg-amber-50/50">
                  <span className="text-sm font-semibold text-amber-700">{counts.S}</span>
                </td>
                <td className="text-center px-2 py-2.5 bg-blue-50/50">
                  <span className="text-sm font-semibold text-blue-700">{counts.I}</span>
                </td>
                <td className="text-center px-2 py-2.5 bg-rose-50/50">
                  <span className="text-sm font-semibold text-rose-700">{counts.A}</span>
                </td>
                <td className="text-center px-3 py-2.5 bg-teal-50/50">
                  <span className={`text-sm font-bold ${counts.total > 0 ? (counts.H / counts.total >= 0.8 ? "text-emerald-700" : counts.H / counts.total >= 0.5 ? "text-amber-700" : "text-rose-700") : "text-slate-400"}`}>
                    {counts.total > 0 ? Math.round((counts.H / counts.total) * 100) : 0}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Keterangan:</span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${statusColors.Hadir}`}>H</span> Hadir
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${statusColors.Sakit}`}>S</span> Sakit
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${statusColors.Izin}`}>I</span> Izin
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${statusColors.Alpa}`}>A</span> Alpa
        </span>
      </div>
    </div>
  );
}
