import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { Materi } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import {
  FileText,
  Presentation,
  File,
  Search,
  Download,
  Link as LinkIcon,
  GraduationCap,
  Loader2,
  BookOpen,
} from "lucide-react";

const tingkatBadge: Record<string, string> = {
  X: "bg-blue-100 text-blue-700",
  XI: "bg-teal-100 text-teal-700",
  XII: "bg-purple-100 text-purple-700",
};

const tingkatLinkBtn: Record<string, string> = {
  X: "bg-blue-500 hover:bg-blue-600",
  XI: "bg-emerald-500 hover:bg-emerald-600",
  XII: "bg-amber-500 hover:bg-amber-600",
};

function getFileIcon(name: string) {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return FileText;
  if (ext === ".ppt" || ext === ".pptx") return Presentation;
  return File;
}

function getFileColor(name: string) {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return "text-red-500 bg-red-50";
  if (ext === ".ppt" || ext === ".pptx") return "text-orange-500 bg-orange-50";
  return "text-blue-500 bg-blue-50";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SiswaMateri() {
  const [data, setData] = useState<Materi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tingkatFilter, setTingkatFilter] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .listMateri({ search, tingkat: tingkatFilter })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, tingkatFilter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleDownload = async (m: Materi) => {
    setDownloadingId(m.id);
    try {
      const token = await import("../../api").then((mod) => mod.getToken());
      const res = await fetch(api.getMateriDownloadUrl(m.id), {
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
      a.download = m.file_name;
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

  return (
    <div>
      <PageHeader
        title="Materi Ajar"
        subtitle="Daftar materi ajar dari guru — file dan link"
      />

      {/* Filter bar */}
      <div className="card mb-4 p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari materi..."
            className="input-field pl-10"
          />
        </div>
        <div className="relative sm:w-48">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={tingkatFilter}
            onChange={(e) => setTingkatFilter(e.target.value)}
            className="input-field pl-10"
          >
            <option value="">Semua Tingkat</option>
            <option value="X">Kelas X</option>
            <option value="XI">Kelas XI</option>
            <option value="XII">Kelas XII</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Belum ada materi"
            subtitle="Materi ajar dari guru akan muncul di sini"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => {
            const isLink = m.tipe === "link";
            const Icon = isLink ? LinkIcon : getFileIcon(m.file_name);
            const colorClass = isLink ? "text-blue-500 bg-blue-50" : getFileColor(m.file_name);
            return (
              <div key={m.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 leading-tight line-clamp-2">{m.judul}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {m.tingkat && (
                        <span className={`badge ${tingkatBadge[m.tingkat] || "bg-slate-100 text-slate-600"}`}>
                          {m.tingkat}
                        </span>
                      )}
                      <span className={`badge ${isLink ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {isLink ? "Link" : "File"}
                      </span>
                      {m.mata_pelajaran && (
                        <span className="badge bg-teal-100 text-teal-700">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {m.mata_pelajaran.nama}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 mb-3 truncate">
                  {isLink ? m.link_url : `${m.file_name} • ${formatSize(m.file_size)}`}
                </div>

                {m.uploaded_by && (
                  <div className="text-xs text-slate-500 mb-3">
                    Oleh: {m.uploaded_by}
                  </div>
                )}

                <div className="mt-auto pt-2">
                  {isLink ? (
                    <a
                      href={m.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn-primary w-full justify-center ${tingkatLinkBtn[m.tingkat || ""] || "bg-slate-600 hover:bg-slate-700"}`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Buka Link
                    </a>
                  ) : (
                    <button
                      onClick={() => handleDownload(m)}
                      className="btn-primary w-full justify-center"
                      disabled={downloadingId === m.id}
                    >
                      {downloadingId === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Unduh File
                    </button>
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
