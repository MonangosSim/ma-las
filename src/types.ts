export type UserType = "admin" | "siswa";

export interface SessionUser {
  token: string;
  user_type: UserType;
  username: string;
  nama: string;
  user_id: string;
  siswa_id?: string;
  kelas_id?: string;
}

export interface Akun {
  id: string;
  username: string;
  password_hash?: string;
  nama: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface Kelas {
  id: string;
  nama_kelas: string;
  tingkat: string;
  jurusan: string;
  wali_kelas: string;
  created_at?: string;
  updated_at?: string;
}

export interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  kelas_id: string | null;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string | null;
  alamat: string;
  nama_ortu: string;
  no_hp_ortu: string;
  password_hash?: string;
  password_1?: string;
  password_2?: string;
  pwd_is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  kelas?: Kelas | null;
}

export interface TahunAjaran {
  id: string;
  nama: string;
  semester_aktif: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Absensi {
  id: string;
  siswa_id: string;
  kelas_id: string | null;
  tanggal: string;
  status: string;
  keterangan: string;
  materi_ajar: string;
  tahun_ajaran_id: string | null;
  semester: string;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa | null;
  kelas?: Kelas | null;
}

export interface AbsensiBatchEntry {
  siswa_id: string;
  status: string;
  keterangan: string;
  existing_id?: string;
}

export interface AbsensiBatchResponse {
  entries: AbsensiBatchEntry[];
  materi_ajar: string;
}

export interface Komite {
  id: string;
  siswa_id: string;
  jenis_iuran: string;
  nominal: number;
  tanggal_bayar: string | null;
  status: string;
  keterangan: string;
  tahun_ajaran_id: string | null;
  semester: string;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa | null;
}

export interface Nilai {
  id: string;
  siswa_id: string;
  mata_pelajaran: string;
  jenis_nilai: string;
  nilai: number;
  semester: string;
  tahun_ajaran_id: string | null;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa | null;
}

export interface MataPelajaran {
  id: string;
  nama: string;
  kode: string;
  keterangan: string;
  created_at?: string;
  updated_at?: string;
}

export interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  tingkat: string;
  kelas_id: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  kelas?: { id: string; nama_kelas: string; tingkat: string } | null;
}

export interface KesepakatanKelas {
  id: string;
  kelas_id: string;
  tahun_ajaran_id: string | null;
  semester: string;
  judul: string;
  isi: string;
  tanggal_dibuat: string;
  created_at?: string;
  updated_at?: string;
  kelas?: Kelas | null;
}

export interface Materi {
  id: string;
  mata_pelajaran_id: string | null;
  judul: string;
  tingkat: string;
  tipe: "file" | "link";
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  link_url: string;
  uploaded_by: string;
  created_at?: string;
  mata_pelajaran?: { id: string; nama: string } | null;
}

export interface Penugasan {
  id: string;
  judul: string;
  deskripsi: string;
  kelas_id: string | null;
  mata_pelajaran_id: string | null;
  tipe: "pdf" | "link";
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  link_url: string;
  deadline: string | null;
  tahun_ajaran_id: string | null;
  semester: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  kelas?: { id: string; nama_kelas: string; tingkat: string } | null;
  mata_pelajaran?: { id: string; nama: string } | null;
}

export interface AdminStats {
  kelas: number;
  siswa: number;
  absensiHariIni: number;
  komiteLunas: number;
  komiteBelumLunas: number;
}

export interface SiswaStats {
  totalAbsensi: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  rataRata: number;
  totalNilai: number;
  komiteLunas: number;
  komiteBelumLunas: number;
}

export interface Keaktifan {
  id: string;
  siswa_id: string;
  kelas_id: string | null;
  tahun_ajaran_id: string | null;
  semester: string;
  slots: boolean[];
  aktif_count: number;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa | null;
  kelas?: Kelas | null;
}

export interface CatatanBuruk {
  id: string;
  siswa_id: string;
  tanggal: string;
  catatan: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa | null;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
