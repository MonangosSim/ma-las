import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Nilai } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { CalendarRange, Download } from "lucide-react";
import * as XLSX from "xlsx";

function getGradeColor(nilai: number): string {
  if (nilai >= 90) return "bg-emerald-100 text-emerald-700";
  if (nilai >= 75) return "bg-teal-100 text-teal-700";
  if (nilai >= 60) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function getGradeLabel(nilai: number): string {
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 70) return "C";
  if (nilai >= 60) return "D";
  return "E";
}

export default function SiswaNilai() {
  const { tahunAjaranList, selectedTahunAjaranId, selectedSemester, setSelectedTahunAjaranId, setSelectedSemester, loading: taLoading } = useTahunAjaran();
  const [data, setData] = useState<Nilai[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedTahunAjaranId) return;
    setLoading(true);
    api
      .listNilai({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedTahunAjaranId, selectedSemester]);

  const handleDownloadExcel = () => {
    const periodeLabel = `${selectedSemester} ${tahunAjaranList.find((t) => t.id === selectedTahunAjaranId)?.nama || ""}`.trim();
    const sorted = [...data].sort((a, b) => {
      const ka = a.nilai_ke ?? 999999;
      const kb = b.nilai_ke ?? 999999;
      return ka - kb;
    });
    const headers = ["Mata Pelajaran", "Jenis", "Nilai Ke", "Nilai", "Grade"];
    const rows = sorted.map((n) => {
      const nilaiNum = Number(n.nilai);
      return [n.mata_pelajaran, n.jenis_nilai, n.nilai_ke ?? "-", nilaiNum, getGradeLabel(nilaiNum)];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nilai");
    XLSX.writeFile(wb, `Nilai_${periodeLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div>
      <PageHeader title="Riwayat Nilai" subtitle="Daftar nilai akademik anda" actions={
        <button
          onClick={handleDownloadExcel}
          className="btn-secondary"
          disabled={loading || data.length === 0}
          title="Download ke Excel"
        >
          <Download className="w-4 h-4" />
          Excel
        </button>
      } />

      <div className="card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Periode:</span>
          </div>
          <select
            value={selectedTahunAjaranId}
            onChange={(e) => setSelectedTahunAjaranId(e.target.value)}
            disabled={taLoading}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-50"
          >
            {tahunAjaranList.map((t) => (
              <option key={t.id} value={t.id}>{t.nama}{t.is_active ? " (Aktif)" : ""}</option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada data nilai" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mata Pelajaran</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jenis</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Nilai Ke</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Nilai</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...data].sort((a, b) => {
                  const ka = a.nilai_ke ?? 999999;
                  const kb = b.nilai_ke ?? 999999;
                  return ka - kb;
                }).map((n) => {
                  const nilaiNum = Number(n.nilai);
                  return (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{n.mata_pelajaran}</td>
                      <td className="px-4 py-3 text-slate-600">{n.jenis_nilai}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">{n.nilai_ke ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${getGradeColor(nilaiNum)}`}>{nilaiNum}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {getGradeLabel(nilaiNum)}
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
  );
}
