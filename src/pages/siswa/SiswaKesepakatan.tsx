import { useEffect, useState } from "react";
import { api } from "../../api";
import type { KesepakatanKelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { ScrollText, CalendarDays } from "lucide-react";

export default function SiswaKesepakatan() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [data, setData] = useState<KesepakatanKelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listKesepakatanKelas({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedTahunAjaranId, selectedSemester]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Kesepakatan Kelas" subtitle="Daftar kesepakatan kelas untuk kelas Anda" />

      {data.length === 0 ? (
        <div className="card">
          <EmptyState title="Belum ada kesepakatan kelas" subtitle="Kesepakatan kelas akan muncul di sini ketika dibuat oleh admin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((k) => (
            <div key={k.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <ScrollText className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 leading-tight">{k.judul}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(k.tanggal_dibuat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{k.isi}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
