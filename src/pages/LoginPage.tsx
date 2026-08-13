import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import type { TahunAjaran } from "../types";
import { GraduationCap, Lock, User, Eye, EyeOff, AlertCircle, Loader2, CalendarRange } from "lucide-react";

const STORAGE_KEY_TA = "ma-las-selected-ta";
const STORAGE_KEY_SEM = "ma-las-selected-semester";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [selectedTA, setSelectedTA] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("Ganjil");
  const [taLoading, setTaLoading] = useState(true);

  useEffect(() => {
    api
      .listTahunAjaranPublic()
      .then((res) => {
        setTahunAjaranList(res.data);
        const active = res.data.find((t) => t.is_active);
        if (active) {
          setSelectedTA(active.id);
          setSelectedSemester(active.semester_aktif);
        } else if (res.data.length > 0) {
          setSelectedTA(res.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setTaLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (selectedTA) localStorage.setItem(STORAGE_KEY_TA, selectedTA);
      localStorage.setItem(STORAGE_KEY_SEM, selectedSemester);
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 shadow-lg shadow-teal-600/30 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Ma-Las Sistem</h1>
          <p className="text-sm text-slate-500 mt-1">Sistem Manajemen Kelas</p>
        </div>

        <div className="card p-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Masuk ke Akun</h2>
          <p className="text-sm text-slate-500 mb-6">
            Gunakan kredensial yang diberikan untuk mengakses sistem.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Username / NISN</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Masukkan username atau NISN"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!taLoading && tahunAjaranList.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Tahun Ajaran</label>
                  <div className="relative">
                    <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedTA}
                      onChange={(e) => setSelectedTA(e.target.value)}
                      className="input-field pl-10"
                      disabled={loading}
                    >
                      {tahunAjaranList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama}{t.is_active ? " (Aktif)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="input-label">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="input-field"
                    disabled={loading}
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-medium text-slate-700">Admin</span> menggunakan username &amp; password yang diberikan.
              <br />
              <span className="font-medium text-slate-700">Siswa/Orang Tua</span> menggunakan NISN sebagai username &amp; password awal.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} Ma-Las Sistem. All rights reserved.
        </p>
      </div>
    </div>
  );
}
