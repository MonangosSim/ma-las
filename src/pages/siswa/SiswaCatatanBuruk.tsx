import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { CatatanBuruk } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { AlertTriangle, CalendarDays } from "lucide-react";

export default function SiswaCatatanBuruk() {
  const [data, setData] = useState<CatatanBuruk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api.listCatatanBuruk()
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  return (
    <div>
      <PageHeader title="Catatan Buruk" subtitle="Daftar catatan pelanggaran dan catatan buruk Anda" />

      {loading ? (
        <div className="card"><LoadingState /></div>
      ) : error ? (
        <div className="card"><ErrorState message={error} /></div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Tidak ada catatan buruk"
            subtitle="Anda tidak memiliki catatan buruk. Tetap jaga perilaku baik!"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div
              key={c.id}
              className="card p-4 border-l-4 border-l-red-500 bg-red-50/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(c.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="text-[10px] text-red-400 font-medium uppercase tracking-wide">
                      Catatan Buruk
                    </span>
                  </div>
                  <p className="text-sm text-red-900 leading-relaxed">{c.catatan}</p>
                  {c.created_by && (
                    <p className="text-xs text-red-400 mt-2">Oleh: {c.created_by}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
