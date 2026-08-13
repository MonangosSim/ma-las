import { useEffect, useState, useCallback } from "react";
import { api, getToken } from "../../api";
import type { Penugasan } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import {
  FileText,
  Link as LinkIcon,
  Download,
  Loader2,
  CalendarClock,
  ClipboardList,
  Search,
  BookOpen,
  School,
} from "lucide-react";

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function SiswaPenugasan() {
  const [data, setData] = useState<Penugasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api.listPenugasan({ search })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleDownload = async (p: Penugasan) => {
    setDownloadingId(p.id);
    try {
      const token = getToken();
      const res = await fetch(api.getPenugasanDownloadUrl(p.id), {
        headers: {
          Authorization: `Bearer ${token || ""}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) throw new Error("Gagal mengunduh file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = p.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh");
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = data.filter((p) =>
    !search || p.judul.toLowerCase().includes(search.toLowerCase()) || (p.deskripsi || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Penugasan" subtitle="Daftar tugas dari guru untuk kelas Anda" />

      <div className="card mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari penugasan..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="card"><LoadingState /></div>
      ) : error ? (
        <div className="card"><ErrorState message={error} /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="Belum ada penugasan" subtitle="Tugas akan muncul di sini ketika guru membuatnya" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const overdue = isOverdue(p.deadline);
            const days = daysUntil(p.deadline);
            return (
              <div key={p.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    p.tipe === "pdf" ? "text-red-500 bg-red-50" : "text-blue-500 bg-blue-50"
                  }`}>
                    {p.tipe === "pdf" ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 leading-tight">{p.judul}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`badge text-[10px] ${p.tipe === "pdf" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {p.tipe === "pdf" ? "PDF" : "Link"}
                      </span>
                      {p.mata_pelajaran?.nama && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <BookOpen className="w-2.5 h-2.5" />
                          {p.mata_pelajaran.nama}
                        </span>
                      )}
                      {p.kelas?.nama_kelas && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <School className="w-2.5 h-2.5" />
                          {p.kelas.nama_kelas}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.deskripsi && (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{p.deskripsi}</p>
                )}

                {p.deadline && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <CalendarClock className={`w-3.5 h-3.5 ${overdue ? "text-red-500" : days !== null && days <= 3 ? "text-amber-500" : "text-slate-400"}`} />
                    <span className={
                      overdue ? "text-red-600 font-medium" : days !== null && days <= 3 ? "text-amber-600 font-medium" : "text-slate-500"
                    }>
                      {overdue
                        ? `Lewat deadline (${new Date(p.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`
                        : days === 0
                          ? "Deadline hari ini!"
                          : days !== null
                            ? `${days} hari lagi (${new Date(p.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`
                            : new Date(p.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}

                <div className="pt-1 mt-auto">
                  {p.tipe === "pdf" ? (
                    <button
                      onClick={() => handleDownload(p)}
                      className="btn-primary w-full"
                      disabled={downloadingId === p.id}
                    >
                      {downloadingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {downloadingId === p.id ? "Mengunduh..." : "Download PDF"}
                    </button>
                  ) : (
                    <a
                      href={p.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full no-underline"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Buka Link Tugas
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
