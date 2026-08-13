import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Komite } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import { useTahunAjaran } from "../../context/TahunAjaranContext";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function SiswaKomite() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [data, setData] = useState<Komite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listKomite({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedTahunAjaranId, selectedSemester]);

  const totalLunas = data.filter((k) => k.status === "Lunas").reduce((sum, k) => sum + Number(k.nominal), 0);
  const totalBelum = data.filter((k) => k.status === "Belum Lunas").reduce((sum, k) => sum + Number(k.nominal), 0);

  return (
    <div>
      <PageHeader title="Iuran Komite" subtitle="Riwayat pembayaran komite anda" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm font-medium text-slate-500">Total Lunas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatRupiah(totalLunas)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-slate-500">Total Belum Lunas</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatRupiah(totalBelum)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada data komite" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jenis Iuran</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Nominal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tgl. Bayar</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{k.jenis_iuran}</td>
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
                    <td className="px-4 py-3 text-slate-600">{k.keterangan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
