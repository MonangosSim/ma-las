import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { Kelas, Siswa, Keaktifan } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import {
  Users,
  Loader2,
  Save,
  CheckCircle2,
  Star,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from "lucide-react";

const NUM_SLOTS = 15;

const EMPTY_SLOTS: boolean[] = new Array(NUM_SLOTS).fill(false);

function aktifToStars(count: number): number {
  if (count >= 15) return 5;
  if (count >= 12) return 4;
  if (count >= 9) return 3;
  if (count >= 6) return 2;
  if (count >= 3) return 1;
  return 0;
}

interface RowState {
  siswa_id: string;
  nama: string;
  nisn: string;
  slots: boolean[];
  aktif_count: number;
  keaktifan_id?: string;
}

export default function KeaktifanManager() {
  const { selectedTahunAjaranId, selectedSemester, tahunAjaranList } = useTahunAjaran();
  const tahunAjaranMap = new Map(tahunAjaranList.map((t) => [t.id, t.nama]));

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedKelas, setSelectedKelas] = useState("");
  const [rows, setRows] = useState<RowState[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listKelas(), api.listSiswa()])
      .then(([kRes, sRes]) => {
        setKelasList(kRes.data);
        setSiswaList(sRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const kelasMap = new Map(kelasList.map((k) => [k.id, k]));

  const loadRows = useCallback(async () => {
    if (!selectedKelas) return;
    setRowsLoading(true);
    setRowsError("");
    setSaveSuccess(false);
    setHasLoaded(true);
    try {
      const siswaInKelas = siswaList
        .filter((s) => s.kelas_id === selectedKelas)
        .sort((a, b) => a.nama.localeCompare(b.nama));

      const keaktifanRes = await api.listKeaktifan({
        kelas_id: selectedKelas,
        tahun_ajaran_id: selectedTahunAjaranId,
        semester: selectedSemester,
      });
      const keaktifanMap = new Map(
        (keaktifanRes.data || []).map((k: Keaktifan) => [k.siswa_id, k]),
      );

      const built: RowState[] = siswaInKelas.map((s) => {
        const existing = keaktifanMap.get(s.id);
        const slots =
          existing && Array.isArray(existing.slots) && existing.slots.length === NUM_SLOTS
            ? [...existing.slots]
            : [...EMPTY_SLOTS];
        return {
          siswa_id: s.id,
          nama: s.nama,
          nisn: s.nisn,
          slots,
          aktif_count: slots.filter(Boolean).length,
          keaktifan_id: existing?.id,
        };
      });

      setRows(built);
    } catch (err) {
      setRowsError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setRowsLoading(false);
    }
  }, [selectedKelas, siswaList, selectedTahunAjaranId, selectedSemester]);

  // Auto-load rows when kelas is selected
  useEffect(() => {
    if (selectedKelas) {
      loadRows();
    }
  }, [selectedKelas, loadRows]);

  const toggleSlot = (siswaId: string, slotIdx: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.siswa_id !== siswaId) return r;
        const newSlots = [...r.slots];
        newSlots[slotIdx] = !newSlots[slotIdx];
        return { ...r, slots: newSlots, aktif_count: newSlots.filter(Boolean).length };
      }),
    );
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedKelas || rows.length === 0) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      await api.upsertKeaktifanBatch(
        rows.map((r) => ({ siswa_id: r.siswa_id, slots: r.slots, aktif_count: r.aktif_count })),
        selectedKelas,
        selectedTahunAjaranId,
        selectedSemester,
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error && kelasList.length === 0) return <ErrorState message={error} />;

  const selectedKelasObj = selectedKelas ? kelasMap.get(selectedKelas) : null;
  const totalAktif = rows.reduce((sum, r) => sum + r.aktif_count, 0);
  const maxPossible = rows.length * NUM_SLOTS;

  return (
    <div>
      <PageHeader
        title="Manajemen Keaktifan Siswa"
        subtitle="Catat keaktifan siswa dalam pembelajaran dengan 15 slot toggle per siswa"
      />

      {/* Step 1: Pilih Kelas */}
      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
          Pilih Kelas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Kelas *</label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setRows([]);
                setHasLoaded(false);
              }}
              className="input-field"
              disabled={rowsLoading}
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
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="font-medium text-sm">
                {selectedSemester} — {tahunAjaranMap.get(selectedTahunAjaranId) || "Belum dipilih"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Daftar Siswa + Toggle Buttons */}
      {hasLoaded && (
        <div className="card overflow-hidden animate-slide-up">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
                Daftar Keaktifan Siswa
              </h3>
              {selectedKelasObj && (
                <p className="text-xs text-slate-500 mt-1 ml-8">
                  {selectedKelasObj.nama_kelas} • Klik tombol untuk menandai keaktifan
                </p>
              )}
            </div>
            {rows.length > 0 && (
              <div className="flex gap-4 text-xs ml-8 sm:ml-0">
                <span className="flex items-center gap-1.5 text-teal-600">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  Total Aktif: {totalAktif}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Maks: {maxPossible}
                </span>
              </div>
            )}
          </div>

          {rowsLoading ? (
            <LoadingState />
          ) : rowsError ? (
            <ErrorState message={rowsError} />
          ) : rows.length === 0 ? (
            <EmptyState title="Tidak ada siswa" subtitle="Kelas yang dipilih belum memiliki siswa terdaftar" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-10">No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[160px]">Nama Siswa</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[420px]">15 Slot Keaktifan</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Aktif</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700 w-32">Bintang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const stars = aktifToStars(row.aktif_count);
                    return (
                      <tr key={row.siswa_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 align-middle">{idx + 1}</td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-700">
                              {row.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{row.nama}</p>
                              <p className="text-xs text-slate-400 font-mono">{row.nisn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-wrap gap-1.5">
                            {row.slots.map((on, i) => (
                              <button
                                key={i}
                                onClick={() => toggleSlot(row.siswa_id, i)}
                                title={`Slot ${i + 1}: ${on ? "Aktif" : "Nonaktif"}`}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                  on
                                    ? "bg-teal-500 text-white shadow-sm scale-105"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                {on ? (
                                  <ToggleRight className="w-5 h-5" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5" />
                                )}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${
                            row.aktif_count > 0
                              ? "bg-teal-100 text-teal-700"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {row.aktif_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-0.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < stars
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-slate-100 text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Save bar */}
          {rows.length > 0 && !rowsLoading && (
            <div className="border-t border-slate-200 p-5 space-y-4 bg-slate-50/50">
              {saveError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-700 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  Data keaktifan berhasil disimpan untuk {selectedKelasObj?.nama_kelas}.
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Menyimpan..." : "Simpan Keaktifan"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasLoaded && (
        <div className="card p-10">
          <EmptyState
            title="Pilih kelas untuk memulai"
            subtitle="Daftar siswa beserta 15 slot keaktifan akan muncul setelah Anda memilih kelas"
            icon={Users}
          />
        </div>
      )}
    </div>
  );
}
