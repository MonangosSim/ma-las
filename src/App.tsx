import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TahunAjaranProvider } from "./context/TahunAjaranContext";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import ChangePasswordModal from "./components/ChangePasswordModal";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import KelasManager from "./pages/admin/KelasManager";
import SiswaManager from "./pages/admin/SiswaManager";
import AbsensiManager from "./pages/admin/AbsensiManager";
import KomiteManager from "./pages/admin/KomiteManager";
import NilaiManager from "./pages/admin/NilaiManager";
import MataPelajaranManager from "./pages/admin/MataPelajaranManager";
import MateriManager from "./pages/admin/MateriManager";
import PengumumanManager from "./pages/admin/PengumumanManager";
import TahunAjaranManager from "./pages/admin/TahunAjaranManager";
import KesepakatanManager from "./pages/admin/KesepakatanManager";
import PenugasanManager from "./pages/admin/PenugasanManager";
import JurnalManager from "./pages/admin/JurnalManager";
import KeaktifanManager from "./pages/admin/KeaktifanManager";
import CatatanBurukManager from "./pages/admin/CatatanBurukManager";

// Siswa pages
import SiswaDashboard from "./pages/siswa/SiswaDashboard";
import SiswaProfil from "./pages/siswa/SiswaProfil";
import SiswaAbsensi from "./pages/siswa/SiswaAbsensi";
import SiswaKomite from "./pages/siswa/SiswaKomite";
import SiswaKesepakatan from "./pages/siswa/SiswaKesepakatan";
import SiswaNilai from "./pages/siswa/SiswaNilai";
import SiswaPenugasan from "./pages/siswa/SiswaPenugasan";
import SiswaMateri from "./pages/siswa/SiswaMateri";
import SiswaKeaktifan from "./pages/siswa/SiswaKeaktifan";
import SiswaCatatanBuruk from "./pages/siswa/SiswaCatatanBuruk";

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [pwModalOpen, setPwModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.user_type === "admin";
  const isSiswaPortal = user.user_type === "siswa" || user.user_type === "ortu";

  const renderPage = () => {
    if (isAdmin) {
      switch (activePage) {
        case "dashboard":
          return <AdminDashboard />;
        case "kelas":
          return <KelasManager />;
        case "siswa":
          return <SiswaManager />;
        case "absensi":
          return <AbsensiManager />;
        case "komite":
          return <KomiteManager />;
        case "nilai":
          return <NilaiManager />;
        case "mata-pelajaran":
          return <MataPelajaranManager />;
        case "materi":
          return <MateriManager />;
        case "pengumuman":
          return <PengumumanManager />;
        case "tahun-ajaran":
          return <TahunAjaranManager />;
        case "kesepakatan-kelas":
          return <KesepakatanManager />;
        case "keaktifan":
          return <KeaktifanManager />;
        case "penugasan":
          return <PenugasanManager />;
        case "catatan-buruk":
          return <CatatanBurukManager />;
        case "jurnal":
          return <JurnalManager />;
        default:
          return <AdminDashboard />;
      }
    } else if (isSiswaPortal) {
      switch (activePage) {
        case "dashboard":
          return <SiswaDashboard />;
        case "profil":
          return <SiswaProfil />;
        case "absensi":
          return <SiswaAbsensi />;
        case "komite":
          return <SiswaKomite />;
        case "nilai":
          return <SiswaNilai />;
        case "kesepakatan-kelas":
          return <SiswaKesepakatan />;
        case "keaktifan":
          return <SiswaKeaktifan />;
        case "penugasan":
          return <SiswaPenugasan />;
        case "catatan-buruk":
          return <SiswaCatatanBuruk />;
        case "materi":
          return <SiswaMateri />;
        default:
          return <SiswaDashboard />;
      }
    }
  };

  return (
    <>
      <TahunAjaranProvider>
        <Layout activePage={activePage} onNavigate={setActivePage} onChangePassword={() => setPwModalOpen(true)}>
          {renderPage()}
        </Layout>
      </TahunAjaranProvider>
      <ChangePasswordModal open={pwModalOpen} onClose={() => setPwModalOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
