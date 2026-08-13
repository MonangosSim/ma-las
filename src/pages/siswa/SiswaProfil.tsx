import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Siswa } from "../../types";
import { PageHeader, LoadingState, ErrorState } from "../../components/UIStates";
import {
  User,
  Hash,
  School,
  MapPin,
  Calendar,
  Phone,
  Users as UsersIcon,
  BookOpen,
} from "lucide-react";

export default function SiswaProfil() {
  const [profile, setProfile] = useState<Siswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProfile()
      .then((p) => setProfile(p.data as Siswa))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!profile) return <ErrorState message="Data profil tidak ditemukan" />;

  const profileSections = [
    {
      title: "Data Pribadi",
      items: [
        { icon: User, label: "Nama Lengkap", value: profile.nama },
        { icon: Hash, label: "NISN", value: profile.nisn },
        { icon: UsersIcon, label: "Jenis Kelamin", value: profile.jenis_kelamin === "L" ? "Laki-laki" : profile.jenis_kelamin === "P" ? "Perempuan" : "-" },
        { icon: MapPin, label: "Tempat Lahir", value: profile.tempat_lahir || "-" },
        { icon: Calendar, label: "Tanggal Lahir", value: profile.tanggal_lahir ? new Date(profile.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-" },
        { icon: MapPin, label: "Alamat", value: profile.alamat || "-" },
      ],
    },
    {
      title: "Data Akademik",
      items: [
        { icon: School, label: "Kelas", value: profile.kelas?.nama_kelas || "Belum ditempatkan" },
        { icon: BookOpen, label: "Tingkat", value: profile.kelas?.tingkat || "-" },
        { icon: School, label: "Jurusan", value: profile.kelas?.jurusan || "-" },
        { icon: User, label: "Wali Kelas", value: profile.kelas?.wali_kelas || "-" },
      ],
    },
    {
      title: "Data Orang Tua",
      items: [
        { icon: UsersIcon, label: "Nama Orang Tua", value: profile.nama_ortu || "-" },
        { icon: Phone, label: "No. HP Orang Tua", value: profile.no_hp_ortu || "-" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader title="Profil Saya" subtitle="Informasi data diri siswa" />

      <div className="card p-6 mb-6 bg-gradient-to-br from-teal-600 to-teal-700 border-teal-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
            {profile.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.nama}</h2>
            <p className="text-sm text-teal-100 mt-0.5">NISN: {profile.nisn}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {profileSections.map((section) => (
          <div key={section.title} className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              {section.title}
            </h3>
            <div className="space-y-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{item.label}</p>
                      <p className="text-sm font-medium text-slate-900">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
