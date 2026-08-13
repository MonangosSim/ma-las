import { useEffect, useState } from "react";
import { api } from "../../api";
import type { SiswaStats, Siswa, Pengumuman } from "../../types";
import StatCard from "../../components/StatCard";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import {
  CalendarCheck,
  Wallet,
  TrendingUp,
  Clock,
  User,
  MapPin,
  Phone,
  Users as UsersIcon,
  Megaphone,
  GraduationCap,
  School,
} from "lucide-react";

function getTargetLabel(p: Pengumuman): { text: string; icon: typeof Megaphone } {
  if (p.kelas_id && p.kelas?.nama_kelas) return { text: p.kelas.nama_kelas, icon: School };
  if (p.tingkat) return { text: `Kelas ${p.tingkat}`, icon: GraduationCap };
  return { text: "Semua Siswa", icon: UsersIcon };
}

export default function SiswaDashboard() {
  const { selectedTahunAjaranId, selectedSemester } = useTahunAjaran();
  const [stats, setStats] = useState<SiswaStats | null>(null);
  const [profile, setProfile] = useState<Siswa | null>(null);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester }), api.getProfile(), api.listPengumuman()])
      .then(([s, p, peng]) => {
        setStats(s as SiswaStats);
        setProfile(p.data as Siswa);
        setPengumuman(peng.data);
      })
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

      {/* Welcome banner */}
      {profile && (
        <div className="card p-6 mb-6 bg-gradient-to-br from-teal-600 to-teal-700 border-teal-700 text-white animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold backdrop-blur-sm">
              {profile.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile.nama}</h2>
              <p className="text-sm text-teal-100">
                NISN: {profile.nisn}
                {profile.kelas && ` • Kelas: ${profile.kelas.nama_kelas}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Announcements */}
      {pengumuman.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Pengumuman</h2>
            <span className="badge bg-teal-100 text-teal-700">{pengumuman.length}</span>
          </div>
          <div className="space-y-3">
            {pengumuman.map((p) => {
              const target = getTargetLabel(p);
              const TargetIcon = target.icon;
              return (
                <div
                  key={p.id}
                  className="card p-4 hover:shadow-md transition-shadow animate-slide-up"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900">{p.judul}</h3>
                        <span className="badge bg-slate-100 text-slate-600 flex items-center gap-1">
                          <TargetIcon className="w-3 h-3" />
                          {target.text}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap">{p.isi}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {p.created_by && `oleh ${p.created_by} • `}
                        {p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric",
                        }) : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Kehadiran"
          value={stats?.hadir ?? 0}
          icon={CalendarCheck}
          color="emerald"
          trend={`dari ${stats?.totalAbsensi ?? 0} total absensi`}
        />
        <StatCard
          label="Rata-rata Nilai"
          value={stats?.rataRata ?? 0}
          icon={TrendingUp}
          color="teal"
          trend={`${stats?.totalNilai ?? 0} catatan nilai`}
        />
        <StatCard
          label="Komite Lunas"
          value={stats?.komiteLunas ?? 0}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          label="Komite Belum Lunas"
          value={stats?.komiteBelumLunas ?? 0}
          icon={Wallet}
          color="rose"
        />
      </div>

      {/* Attendance breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Rekap Absensi</h3>
          <div className="space-y-3">
            <AttendanceRow label="Hadir" count={stats?.hadir ?? 0} total={stats?.totalAbsensi ?? 0} color="bg-emerald-500" />
            <AttendanceRow label="Sakit" count={stats?.sakit ?? 0} total={stats?.totalAbsensi ?? 0} color="bg-amber-500" />
            <AttendanceRow label="Izin" count={stats?.izin ?? 0} total={stats?.totalAbsensi ?? 0} color="bg-blue-500" />
            <AttendanceRow label="Alpa" count={stats?.alpa ?? 0} total={stats?.totalAbsensi ?? 0} color="bg-rose-500" />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Informasi Kontak</h3>
          {profile && (
            <div className="space-y-3 text-sm">
              <InfoRow icon={User} label="Nama Lengkap" value={profile.nama} />
              <InfoRow icon={UsersIcon} label="Jenis Kelamin" value={profile.jenis_kelamin === "L" ? "Laki-laki" : profile.jenis_kelamin === "P" ? "Perempuan" : "-"} />
              <InfoRow icon={MapPin} label="Tempat Lahir" value={profile.tempat_lahir || "-"} />
              <InfoRow icon={CalendarCheck} label="Tanggal Lahir" value={profile.tanggal_lahir ? new Date(profile.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
              <InfoRow icon={Phone} label="No. HP Orang Tua" value={profile.no_hp_ortu || "-"} />
              <InfoRow icon={UsersIcon} label="Nama Orang Tua" value={profile.nama_ortu || "-"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AttendanceRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {count} kali <span className="text-slate-400">•</span>{" "}
          <span className="font-semibold text-slate-700">{pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
