import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../api";
import type { Absensi, Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import {
  BookOpen,
  CalendarDays,
  Printer,
  Search,
  Users,
  GraduationCap,
  Eye,
} from "lucide-react";
import Modal from "../../components/Modal";

interface JournalEntry {
  key: string;
  tanggal: string;
  kelas_id: string;
  kelas_nama: string;
  materi_ajar: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  total: number;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatDate(iso: string): { day: string; date: string; month: string; year: string } {
  const d = new Date(iso);
  return {
    day: DAYS[d.getDay()],
    date: String(d.getDate()).padStart(2, "0"),
    month: MONTHS[d.getMonth()],
    year: String(d.getFullYear()),
  };
}

export default function JurnalManager() {
  const { selectedTahunAjaranId, selectedSemester, tahunAjaranList } = useTahunAjaran();
  const tahunAjaranMap = new Map(tahunAjaranList.map((t) => [t.id, t.nama]));
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    api.listKelas()
      .then((res) => setKelasList(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingKelas(false));
  }, []);

  const loadJournal = useCallback(() => {
    setLoading(true);
    setError("");
    api.listAbsensi({
      kelas_id: kelasFilter || undefined,
      tahun_ajaran_id: selectedTahunAjaranId,
      semester: selectedSemester,
    })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [kelasFilter, selectedTahunAjaranId, selectedSemester]);

  useEffect(() => {
    const t = setTimeout(loadJournal, 300);
    return () => clearTimeout(t);
  }, [loadJournal]);

  const kelasMap = new Map(kelasList.map((k) => [k.id, k]));

  const journalEntries = useMemo<JournalEntry[]>(() => {
    const grouped = new Map<string, Absensi[]>();
    for (const a of data) {
      const key = `${a.tanggal}_${a.kelas_id || "no-kelas"}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }

    const entries: JournalEntry[] = [];
    for (const [key, records] of grouped) {
      const first = records[0];
      const counts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
      for (const r of records) {
        if (r.status in counts) counts[r.status as keyof typeof counts]++;
      }
      entries.push({
        key,
        tanggal: first.tanggal,
        kelas_id: first.kelas_id || "",
        kelas_nama: first.kelas?.nama_kelas || kelasMap.get(first.kelas_id || "")?.nama_kelas || "-",
        materi_ajar: first.materi_ajar || "-",
        hadir: counts.Hadir,
        sakit: counts.Sakit,
        izin: counts.Izin,
        alpa: counts.Alpa,
        total: records.length,
      });
    }

    entries.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return entries;
  }, [data, kelasMap]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return journalEntries;
    const q = search.toLowerCase();
    return journalEntries.filter(
      (e) =>
        e.materi_ajar.toLowerCase().includes(q) ||
        e.kelas_nama.toLowerCase().includes(q) ||
        e.tanggal.includes(q),
    );
  }, [journalEntries, search]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, e) => ({
        hadir: acc.hadir + e.hadir,
        sakit: acc.sakit + e.sakit,
        izin: acc.izin + e.izin,
        alpa: acc.alpa + e.alpa,
        total: acc.total + e.total,
        sessions: acc.sessions + 1,
      }),
      { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, sessions: 0 },
    );
  }, [filteredEntries]);

  const handlePrint = () => {
    window.print();
  };

  if (loadingKelas) return <LoadingState />;
  if (error && kelasList.length === 0) return <ErrorState message={error} />;

  const tahunNama = tahunAjaranMap.get(selectedTahunAjaranId) || "-";
  const periodeLabel = `${tahunNama} - Semester ${selectedSemester}`;

  return (
    <div>
      <PageHeader
        title="Jurnal Kelas"
        subtitle="Rekap jurnal mengajar harian untuk laporan kepada pimpinan"
        actions={
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors print:hidden"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 print:hidden">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Filter Kelas</label>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Cari Materi / Tanggal</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari materi ajar atau tanggal..."
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report header (print only) */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-lg font-bold">LAPORAN JURNAL MENGAJAR</h1>
        <p className="text-sm">Periode: {periodeLabel}</p>
        {kelasFilter && (
          <p className="text-sm">Kelas: {kelasMap.get(kelasFilter)?.nama_kelas || "-"}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <SummaryCard label="Total Pertemuan" value={totals.sessions} icon={CalendarDays} color="teal" />
        <SummaryCard label="Hadir" value={totals.hadir} icon={Users} color="emerald" />
        <SummaryCard label="Sakit" value={totals.sakit} icon={Users} color="amber" />
        <SummaryCard label="Izin" value={totals.izin} icon={Users} color="blue" />
        <SummaryCard label="Alpa" value={totals.alpa} icon={Users} color="rose" />
        <SummaryCard label="Total Siswa" value={totals.total} icon={GraduationCap} color="slate" />
      </div>

      {/* Journal table */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : filteredEntries.length === 0 ? (
        <EmptyState title="Belum ada jurnal" subtitle="Data absensi harian akan otomatis menjadi jurnal mengajar di sini" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-12">No</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[120px]">Tanggal</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[100px]">Kelas</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[200px]">Materi Ajar</th>
                  <th className="text-center px-3 py-3 font-semibold text-emerald-600 text-xs uppercase tracking-wider">H</th>
                  <th className="text-center px-3 py-3 font-semibold text-amber-600 text-xs uppercase tracking-wider">S</th>
                  <th className="text-center px-3 py-3 font-semibold text-blue-600 text-xs uppercase tracking-wider">I</th>
                  <th className="text-center px-3 py-3 font-semibold text-rose-600 text-xs uppercase tracking-wider">A</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Total</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry, idx) => {
                  const d = formatDate(entry.tanggal);
                  return (
                    <tr key={entry.key} className="hover:bg-slate-50 transition-colors">
                      <td className="text-center px-3 py-3 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-slate-800">
                          {d.day}, {d.date} {d.month} {d.year}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-medium">
                          {entry.kelas_nama}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{entry.materi_ajar}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-sm font-semibold text-emerald-700">{entry.hadir}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-sm font-semibold text-amber-700">{entry.sakit}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-sm font-semibold text-blue-700">{entry.izin}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-sm font-semibold text-rose-700">{entry.alpa}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-sm font-bold text-slate-700">{entry.total}</span>
                      </td>
                      <td className="text-center px-3 py-3 print:hidden">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-3 py-3 text-right text-sm font-bold text-slate-700">
                    Total
                  </td>
                  <td className="text-center px-3 py-3 text-sm font-bold text-emerald-700">{totals.hadir}</td>
                  <td className="text-center px-3 py-3 text-sm font-bold text-amber-700">{totals.sakit}</td>
                  <td className="text-center px-3 py-3 text-sm font-bold text-blue-700">{totals.izin}</td>
                  <td className="text-center px-3 py-3 text-sm font-bold text-rose-700">{totals.alpa}</td>
                  <td className="text-center px-3 py-3 text-sm font-bold text-slate-700">{totals.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Ringkasan Jurnal Mengajar"
        size="md"
      >
        {selectedEntry && (() => {
          const d = formatDate(selectedEntry.tanggal);
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="w-4 h-4" />
                <span>{d.day}, {d.date} {d.month} {d.year}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Mengajar di kelas{" "}
                  <span className="font-semibold text-slate-900">{selectedEntry.kelas_nama}</span>
                  {" "}dengan materi yang disampaikan{" "}
                  <span className="font-semibold text-slate-900">{selectedEntry.materi_ajar}</span>.
                  <br />
                  <br />
                  Pertemuan tersebut dihadiri oleh siswa sebanyak{" "}
                  <span className="font-semibold text-emerald-700">{selectedEntry.hadir} siswa</span>,
                  Sakit{" "}
                  <span className="font-semibold text-amber-700">{selectedEntry.sakit} siswa</span>,
                  Ijin{" "}
                  <span className="font-semibold text-blue-700">{selectedEntry.izin} siswa</span>{" "}
                  dan Alpa{" "}
                  <span className="font-semibold text-rose-700">{selectedEntry.alpa} siswa</span>.
                </p>
              </div>

              {/* Attendance breakdown bar */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Rincian Kehadiran</p>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                  {selectedEntry.total > 0 && (
                    <div className="bg-emerald-500" style={{ width: `${(selectedEntry.hadir / selectedEntry.total) * 100}%` }} />
                  )}
                  {selectedEntry.total > 0 && (
                    <div className="bg-amber-500" style={{ width: `${(selectedEntry.sakit / selectedEntry.total) * 100}%` }} />
                  )}
                  {selectedEntry.total > 0 && (
                    <div className="bg-blue-500" style={{ width: `${(selectedEntry.izin / selectedEntry.total) * 100}%` }} />
                  )}
                  {selectedEntry.total > 0 && (
                    <div className="bg-rose-500" style={{ width: `${(selectedEntry.alpa / selectedEntry.total) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <Legend color="bg-emerald-500" label="Hadir" value={selectedEntry.hadir} />
                  <Legend color="bg-amber-500" label="Sakit" value={selectedEntry.sakit} />
                  <Legend color="bg-blue-500" label="Izin" value={selectedEntry.izin} />
                  <Legend color="bg-rose-500" label="Alpa" value={selectedEntry.alpa} />
                </div>
              </div>

              <p className="text-sm text-slate-500 italic">Demikian.</p>

              <div className="flex justify-end gap-2 pt-2">
                <button
n                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setSelectedEntry(null);
                    setTimeout(() => window.print(), 100);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Cetak
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Print signature area */}
      <div className="hidden print:flex justify-end mt-10">
        <div className="text-center">
          <p className="text-sm">Mengetahui,</p>
          <p className="text-sm">Kepala Madrasah</p>
          <div className="h-20" />
          <p className="text-sm font-bold">(_________________)</p>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="text-xs text-slate-600">{label}: {value}</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  color: "teal" | "emerald" | "amber" | "blue" | "rose" | "slate";
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <div className={`rounded-xl border p-3.5 ${colors[color]} print:break-inside-avoid`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
