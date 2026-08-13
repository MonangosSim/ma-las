import { useEffect, useState } from "react";
import { api } from "../../api";
import type { AdminStats } from "../../types";
import StatCard from "../../components/StatCard";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { School, Users, CalendarCheck, Wallet, TrendingUp, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester })
      .then((s) => setStats(s as AdminStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTahunAjaranId, selectedSemester]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {today}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Kelas"
          value={stats?.kelas ?? 0}
          icon={School}
          color="teal"
        />
        <StatCard
          label="Total Siswa"
          value={stats?.siswa ?? 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Absensi Hari Ini"
          value={stats?.absensiHariIni ?? 0}
          icon={CalendarCheck}
          color="amber"
          trend="Catatan kehadiran tercatat"
        />
        <StatCard
          label="Komite Lunas"
          value={stats?.komiteLunas ?? 0}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          label="Komite Belum Lunas"
          value={stats?.komiteBelumLunas ?? 0}
          icon={Wallet}
          color="rose"
        />
        <StatCard
          label="Total Iuran"
          value={(stats?.komiteLunas ?? 0) + (stats?.komiteBelumLunas ?? 0)}
          icon={TrendingUp}
          color="slate"
          trend="Seluruh catatan komite"
        />
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Selamat Datang</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Anda masuk sebagai <span className="font-medium text-slate-700">Administrator</span>. Gunakan menu di
          samping untuk mengelola data Kelas, Siswa, Absensi, Komite, dan Nilai. Sistem ini memungkinkan pengolahan
          dan manajemen data secara terpusat, sementara akun Siswa/Orang Tua hanya dapat melihat informasi terkait
          diri mereka sendiri.
        </p>
      </div>
    </div>
  );
}
