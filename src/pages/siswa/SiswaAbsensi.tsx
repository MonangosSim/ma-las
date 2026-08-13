import { useEffect, useState, useMemo } from "react";
import { api } from "../../api";
import type { Absensi } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { BookOpen, CalendarCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  Hadir: "bg-emerald-100 text-emerald-700",
  Sakit: "bg-amber-100 text-amber-700",
  Izin: "bg-blue-100 text-blue-700",
  Alpa: "bg-rose-100 text-rose-700",
};

const barColors: Record<string, string> = {
  Hadir: "bg-emerald-500",
  Sakit: "bg-amber-500",
  Izin: "bg-blue-500",
  Alpa: "bg-rose-500",
};

export default function SiswaAbsensi() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [data, setData] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listAbsensi({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedTahunAjaranId, selectedSemester]);

  const recap = useMemo(() => {
    const counts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    for (const a of data) {
      if (a.status in counts) counts[a.status as keyof typeof counts]++;
    }
    const total = data.length;
    return { counts, total };
  }, [data]);

  const pct = (count: number) => (recap.total > 0 ? (count / recap.total) * 100 : 0);

  return (
    <div>
      <PageHeader title="Riwayat Absensi" subtitle="Data kehadiran anda" />

      {/* Recap with percentages */}
      {!loading && !error && data.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-700">Rekap Kehadiran</h3>
          </div>

          <div className="space-y-3">
            {(["Hadir", "Sakit", "Izin", "Alpa"] as const).map((status) => {
              const count = recap.counts[status];
              const percentage = pct(count);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{status}</span>
                    <span className="text-slate-500">
                      {count} kali <span className="text-slate-400">•</span>{" "}
                      <span className="font-semibold text-slate-700">{percentage.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${barColors[status]} rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Total Pertemuan</span>
            <span className="font-bold text-slate-800">{recap.total}</span>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada data absensi" />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((a) => (
              <div key={a.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(a.tanggal).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {a.keterangan && (
                      <p className="text-xs text-slate-500 mt-1">{a.keterangan}</p>
                    )}
                    {a.materi_ajar && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-teal-50/70 px-3 py-2">
                        <BookOpen className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-teal-800">{a.materi_ajar}</p>
                      </div>
                    )}
                  </div>
                  <span className={`badge ${statusColors[a.status] || "bg-slate-100 text-slate-700"} flex-shrink-0`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
