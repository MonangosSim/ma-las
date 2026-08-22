import { type ReactNode, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTahunAjaran } from "../context/TahunAjaranContext";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  CalendarCheck,
  Wallet,
  BookOpen,
  LogOut,
  Menu,
  X,
  KeyRound,
  BookMarked,
  FileText,
  Megaphone,
  CalendarRange,
  ScrollText,
  ClipboardList,
  ChevronDown,
  FolderTree,
  GraduationCap as GradIcon,
  Building2,
  NotebookPen,
  Sparkles,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const adminGroups: NavGroup[] = [
  {
    id: "data-sekolah",
    label: "Data Sekolah",
    icon: Building2,
    items: [
      { key: "kelas", label: "Kelas", icon: School },
      { key: "siswa", label: "Siswa", icon: Users },
      { key: "mata-pelajaran", label: "Mata Pelajaran", icon: BookMarked },
      { key: "tahun-ajaran", label: "Tahun Ajaran", icon: CalendarRange },
    ],
  },
  {
    id: "akademik",
    label: "Akademik",
    icon: GradIcon,
    items: [
      { key: "absensi", label: "Absensi", icon: CalendarCheck },
      { key: "nilai", label: "Nilai", icon: BookOpen },
      { key: "materi", label: "Materi Ajar", icon: FileText },
      { key: "penugasan", label: "Penugasan", icon: ClipboardList },
      { key: "kesepakatan-kelas", label: "Kesepakatan Kelas", icon: ScrollText },
      { key: "keaktifan", label: "Keaktifan Siswa", icon: Sparkles },
    ],
  },
  {
    id: "administrasi",
    label: "Administrasi",
    icon: Wallet,
    items: [
      { key: "komite", label: "Komite", icon: Wallet },
      { key: "pengumuman", label: "Pengumuman", icon: Megaphone },
      { key: "jurnal", label: "Jurnal Kelas", icon: NotebookPen },
    ],
  },
];

const adminStandalone: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const siswaNav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "profil", label: "Profil Saya", icon: Users },
  { key: "absensi", label: "Absensi", icon: CalendarCheck },
  { key: "komite", label: "Komite", icon: Wallet },
  { key: "nilai", label: "Nilai", icon: BookOpen },
  { key: "kesepakatan-kelas", label: "Kesepakatan Kelas", icon: ScrollText },
  { key: "keaktifan", label: "Keaktifan Saya", icon: Sparkles },
  { key: "penugasan", label: "Penugasan", icon: ClipboardList },
  { key: "materi", label: "Materi Ajar", icon: FileText },
];

interface LayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
  onChangePassword: () => void;
}

export default function Layout({ activePage, onNavigate, children, onChangePassword }: LayoutProps) {
  const { user, logout } = useAuth();
  const { tahunAjaranList, selectedTahunAjaranId, selectedSemester, setSelectedTahunAjaranId, setSelectedSemester, loading: taLoading } = useTahunAjaran();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const isAdmin = user?.user_type === "admin";
  const isOrtu = user?.user_type === "ortu";

  // Auto-open the group containing the active page
  useEffect(() => {
    if (!isAdmin) return;
    for (const group of adminGroups) {
      if (group.items.some((item) => item.key === activePage)) {
        setOpenGroups((prev) => new Set(prev).add(group.id));
      }
    }
  }, [activePage, isAdmin]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-shrink-0 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Ma-Las Sistem</p>
              <p className="text-[10px] text-slate-400">{isAdmin ? "Admin Panel" : isOrtu ? "Portal Orang Tua" : "Portal Siswa"}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {/* Standalone items (Dashboard) - admin only */}
          {isAdmin && adminStandalone.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}

          {/* Grouped dropdowns for admin */}
          {isAdmin &&
            adminGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = openGroups.has(group.id);
              const hasActiveChild = group.items.some((item) => item.key === activePage);
              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      hasActiveChild
                        ? "text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon className="w-[18px] h-[18px]" />
                      {group.label}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-3 pl-3 border-l border-slate-700/60 space-y-0.5 mt-0.5 mb-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = activePage === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleNavigate(item.key)}
                            className={`w-full flex items-center gap-3 pl-2 pr-3 py-2 rounded-lg text-sm transition-all ${
                              active
                                ? "bg-teal-600/90 text-white font-medium shadow-sm"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Siswa nav (flat list) */}
          {!isAdmin &&
            siswaNav.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </button>
              );
            })}
        </nav>

        <div className="px-3 py-3 border-t border-slate-800 space-y-1">
          <button
            onClick={onChangePassword}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <KeyRound className="w-[18px] h-[18px]" />
            Ubah Password
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-icon">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                {user?.nama?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.nama}</p>
                <p className="text-xs text-slate-500">
                  {isAdmin ? "Administrator" : isOrtu ? "Orang Tua" : "Siswa"}
                  {user?.username && ` • ${user.username}`}
                </p>
              </div>
            </div>
          </div>

          {isAdmin && !taLoading && tahunAjaranList.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarRange className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Periode:</span>
              </div>
              <select
                value={selectedTahunAjaranId}
                onChange={(e) => setSelectedTahunAjaranId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                {tahunAjaranList.map((t: { id: string; nama: string; is_active: boolean }) => (
                  <option key={t.id} value={t.id}>{t.nama}{t.is_active ? " (Aktif)" : ""}</option>
                ))}
              </select>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
