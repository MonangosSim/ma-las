import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Keaktifan } from "../../types";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { useAuth } from "../../context/AuthContext";
import { Star, Sparkles, TrendingUp, Clock } from "lucide-react";

const NUM_SLOTS = 15;

function aktifToStars(count: number): number {
  if (count >= 15) return 5;
  if (count >= 12) return 4;
  if (count >= 9) return 3;
  if (count >= 6) return 2;
  if (count >= 3) return 1;
  return 0;
}

function starLabel(stars: number): string {
  if (stars === 5) return "Sangat Aktif";
  if (stars === 4) return "Aktif";
  if (stars === 3) return "Cukup Aktif";
  if (stars === 2) return "Kurang Aktif";
  if (stars === 1) return "Mulai Aktif";
  return "Belum Aktif";
}

export default function SiswaKeaktifan() {
  const { selectedTahunAjaranId, selectedSemester, tahunAjaranList } = useTahunAjaran();
  const { user } = useAuth();
  const [data, setData] = useState<Keaktifan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.siswa_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .listKeaktifan({
        tahun_ajaran_id: selectedTahunAjaranId,
        semester: selectedSemester,
      })
      .then((res) => {
        const mine = (res.data || []).find((k) => k.siswa_id === user.siswa_id) || null;
        setData(mine);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.siswa_id, selectedTahunAjaranId, selectedSemester]);

  const tahunAjaranMap = new Map(tahunAjaranList.map((t) => [t.id, t.nama]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-rose-600 text-sm">
        {error}
      </div>
    );
  }

  const slots = data && Array.isArray(data.slots) && data.slots.length === NUM_SLOTS
    ? data.slots
    : new Array(NUM_SLOTS).fill(false);
  const aktifCount = data?.aktif_count ?? slots.filter(Boolean).length;
  const stars = aktifToStars(aktifCount);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Keaktifan Saya</h1>
        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {selectedSemester} — {tahunAjaranMap.get(selectedTahunAjaranId) || "Belum dipilih"}
        </p>
      </div>

      {/* Hero star card */}
      <div className="card p-8 mb-6 bg-gradient-to-br from-teal-600 to-teal-700 border-teal-700 text-white text-center animate-slide-up">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-teal-200" />
          <h2 className="text-base font-semibold">Penilaian Keaktifan</h2>
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className={`w-12 h-12 transition-all duration-300 ${
                i < stars
                  ? "fill-amber-300 text-amber-300 drop-shadow-lg"
                  : "fill-white/10 text-white/20"
              }`}
            />
          ))}
        </div>
        <p className="text-2xl font-bold mb-1">{starLabel(stars)}</p>
        <p className="text-sm text-teal-100">
          {aktifCount} dari {NUM_SLOTS} slot aktif
        </p>
      </div>

      {/* Progress detail */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <p className="text-xs text-slate-500">Slot Aktif</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{aktifCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">dari {NUM_SLOTS} slot</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-slate-500">Bintang</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stars}/5</p>
          <p className="text-xs text-slate-400 mt-0.5">{starLabel(stars)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <p className="text-xs text-slate-500">Persentase</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {Math.round((aktifCount / NUM_SLOTS) * 100)}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">keaktifan total</p>
        </div>
      </div>

      {/* Slot breakdown */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Rincian Slot Keaktifan</h3>
        {!data ? (
          <p className="text-sm text-slate-500 text-center py-6">
            Belum ada data keaktifan untuk periode ini. Data akan muncul setelah guru mencatat keaktifan Anda.
          </p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-15 gap-2">
            {slots.map((on, i) => (
              <div
                key={i}
                title={`Slot ${i + 1}: ${on ? "Aktif" : "Nonaktif"}`}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                  on
                    ? "bg-teal-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <Star className={`w-4 h-4 mb-0.5 ${on ? "fill-white text-white" : "fill-slate-200 text-slate-300"}`} />
                <span className="text-[10px] font-medium">{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
