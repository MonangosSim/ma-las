/*
# Ma-Las Sistem (Manajemen Kelas) - Database Schema

## Overview
Creates the complete schema for a school class management system with two account levels:
- Admin accounts (stored in `akun`) for data management
- Siswa/Orang Tua accounts (stored in `siswa`) for viewing student information

## New Tables
1. `akun` — Admin accounts (username/password login)
2. `kelas` — Class/classroom information
3. `siswa` — Student records (NISN-based login, linked to kelas)
4. `absensi` — Daily attendance per student
5. `komite` — School committee contributions/payments per student
6. `nilai` — Academic grades per student per subject
7. `sessions` — Login session tokens for custom auth

## Security
- RLS enabled on ALL tables with authenticated-only policies.
- Data access mediated through edge function with service role key.

## Seed Data
- Initial admin: username='adMin', password='me1r1n4***MBHS' (SHA-256 hashed)
- Sample kelas, siswa, absensi, komite, nilai records
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLE: akun (Admin accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS akun (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  nama text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE akun ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "akun_select_authenticated" ON akun;
CREATE POLICY "akun_select_authenticated" ON akun FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "akun_insert_authenticated" ON akun;
CREATE POLICY "akun_insert_authenticated" ON akun FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "akun_update_authenticated" ON akun;
CREATE POLICY "akun_update_authenticated" ON akun FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "akun_delete_authenticated" ON akun;
CREATE POLICY "akun_delete_authenticated" ON akun FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TABLE: kelas (Classes)
-- ============================================================
CREATE TABLE IF NOT EXISTS kelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kelas text NOT NULL,
  tingkat text NOT NULL,
  jurusan text DEFAULT '',
  wali_kelas text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kelas_select_authenticated" ON kelas;
CREATE POLICY "kelas_select_authenticated" ON kelas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "kelas_insert_authenticated" ON kelas;
CREATE POLICY "kelas_insert_authenticated" ON kelas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "kelas_update_authenticated" ON kelas;
CREATE POLICY "kelas_update_authenticated" ON kelas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "kelas_delete_authenticated" ON kelas;
CREATE POLICY "kelas_delete_authenticated" ON kelas FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TABLE: siswa (Students — also login accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS siswa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn text UNIQUE NOT NULL,
  nama text NOT NULL,
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  jenis_kelamin text DEFAULT '',
  tempat_lahir text DEFAULT '',
  tanggal_lahir date,
  alamat text DEFAULT '',
  nama_ortu text DEFAULT '',
  no_hp_ortu text DEFAULT '',
  password_hash text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "siswa_select_authenticated" ON siswa;
CREATE POLICY "siswa_select_authenticated" ON siswa FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "siswa_insert_authenticated" ON siswa;
CREATE POLICY "siswa_insert_authenticated" ON siswa FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "siswa_update_authenticated" ON siswa;
CREATE POLICY "siswa_update_authenticated" ON siswa FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "siswa_delete_authenticated" ON siswa;
CREATE POLICY "siswa_delete_authenticated" ON siswa FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas_id ON siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON siswa(nisn);

-- ============================================================
-- TABLE: absensi (Attendance)
-- ============================================================
CREATE TABLE IF NOT EXISTS absensi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  tanggal date NOT NULL,
  status text NOT NULL DEFAULT 'Hadir',
  keterangan text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "absensi_select_authenticated" ON absensi;
CREATE POLICY "absensi_select_authenticated" ON absensi FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "absensi_insert_authenticated" ON absensi;
CREATE POLICY "absensi_insert_authenticated" ON absensi FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "absensi_update_authenticated" ON absensi;
CREATE POLICY "absensi_update_authenticated" ON absensi FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "absensi_delete_authenticated" ON absensi;
CREATE POLICY "absensi_delete_authenticated" ON absensi FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_id ON absensi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON absensi(tanggal);

-- ============================================================
-- TABLE: komite (School committee contributions)
-- ============================================================
CREATE TABLE IF NOT EXISTS komite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  jenis_iuran text NOT NULL DEFAULT 'Bulanan',
  nominal numeric(12,2) NOT NULL DEFAULT 0,
  tanggal_bayar date,
  status text NOT NULL DEFAULT 'Belum Lunas',
  keterangan text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE komite ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "komite_select_authenticated" ON komite;
CREATE POLICY "komite_select_authenticated" ON komite FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "komite_insert_authenticated" ON komite;
CREATE POLICY "komite_insert_authenticated" ON komite FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "komite_update_authenticated" ON komite;
CREATE POLICY "komite_update_authenticated" ON komite FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "komite_delete_authenticated" ON komite;
CREATE POLICY "komite_delete_authenticated" ON komite FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_komite_siswa_id ON komite(siswa_id);

-- ============================================================
-- TABLE: nilai (Grades)
-- ============================================================
CREATE TABLE IF NOT EXISTS nilai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  mata_pelajaran text NOT NULL,
  jenis_nilai text NOT NULL DEFAULT 'Harian',
  nilai numeric(5,2) NOT NULL DEFAULT 0,
  semester text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nilai_select_authenticated" ON nilai;
CREATE POLICY "nilai_select_authenticated" ON nilai FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "nilai_insert_authenticated" ON nilai;
CREATE POLICY "nilai_insert_authenticated" ON nilai FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "nilai_update_authenticated" ON nilai;
CREATE POLICY "nilai_update_authenticated" ON nilai FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "nilai_delete_authenticated" ON nilai;
CREATE POLICY "nilai_delete_authenticated" ON nilai FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_nilai_siswa_id ON nilai(siswa_id);
CREATE INDEX IF NOT EXISTS idx_nilai_semester ON nilai(semester);

-- ============================================================
-- TABLE: sessions (Login session tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  user_type text NOT NULL,
  username text NOT NULL,
  nama text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_select_authenticated" ON sessions;
CREATE POLICY "sessions_select_authenticated" ON sessions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sessions_insert_authenticated" ON sessions;
CREATE POLICY "sessions_insert_authenticated" ON sessions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sessions_update_authenticated" ON sessions;
CREATE POLICY "sessions_update_authenticated" ON sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sessions_delete_authenticated" ON sessions;
CREATE POLICY "sessions_delete_authenticated" ON sessions FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- SEED: Initial admin account (password: me1r1n4***MBHS)
-- ============================================================
INSERT INTO akun (username, password_hash, nama, role)
SELECT 'adMin', encode(digest('ma-las-salt:me1r1n4***MBHS', 'sha256'), 'hex'), 'Administrator', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM akun WHERE username = 'adMin');

-- ============================================================
-- SEED: Sample kelas
-- ============================================================
INSERT INTO kelas (nama_kelas, tingkat, jurusan, wali_kelas)
SELECT 'X IPA 1', 'X', 'IPA', 'Budi Santoso, S.Pd.'
WHERE NOT EXISTS (SELECT 1 FROM kelas WHERE nama_kelas = 'X IPA 1');
INSERT INTO kelas (nama_kelas, tingkat, jurusan, wali_kelas)
SELECT 'X IPS 1', 'X', 'IPS', 'Siti Rahayu, S.Pd.'
WHERE NOT EXISTS (SELECT 1 FROM kelas WHERE nama_kelas = 'X IPS 1');
INSERT INTO kelas (nama_kelas, tingkat, jurusan, wali_kelas)
SELECT 'XI IPA 1', 'XI', 'IPA', 'Ahmad Hidayat, M.Pd.'
WHERE NOT EXISTS (SELECT 1 FROM kelas WHERE nama_kelas = 'XI IPA 1');

-- ============================================================
-- SEED: Sample siswa (password = NISN)
-- ============================================================
INSERT INTO siswa (nisn, nama, kelas_id, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_ortu, no_hp_ortu, password_hash)
SELECT '1234567891', 'Andi Pratama', k.id, 'L', 'Jakarta', '2008-05-15', 'Jl. Merdeka No. 10', 'Bambang Pratama', '081234567890',
       encode(digest('ma-las-salt:1234567891', 'sha256'), 'hex')
FROM kelas k
WHERE k.nama_kelas = 'X IPA 1'
  AND NOT EXISTS (SELECT 1 FROM siswa WHERE nisn = '1234567891');

INSERT INTO siswa (nisn, nama, kelas_id, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_ortu, no_hp_ortu, password_hash)
SELECT '1234567892', 'Dewi Lestari', k.id, 'P', 'Bandung', '2008-08-22', 'Jl. Sudirman No. 5', 'Sutrisno Lestari', '081234567891',
       encode(digest('ma-las-salt:1234567892', 'sha256'), 'hex')
FROM kelas k
WHERE k.nama_kelas = 'X IPA 1'
  AND NOT EXISTS (SELECT 1 FROM siswa WHERE nisn = '1234567892');

INSERT INTO siswa (nisn, nama, kelas_id, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_ortu, no_hp_ortu, password_hash)
SELECT '1234567893', 'Rizki Ramadhan', k.id, 'L', 'Surabaya', '2007-03-10', 'Jl. Diponegoro No. 20', 'Joko Ramadhan', '081234567892',
       encode(digest('ma-las-salt:1234567893', 'sha256'), 'hex')
FROM kelas k
WHERE k.nama_kelas = 'XI IPA 1'
  AND NOT EXISTS (SELECT 1 FROM siswa WHERE nisn = '1234567893');

-- ============================================================
-- SEED: Sample absensi
-- ============================================================
INSERT INTO absensi (siswa_id, kelas_id, tanggal, status, keterangan)
SELECT s.id, s.kelas_id, CURRENT_DATE, 'Hadir', ''
FROM siswa s
WHERE s.nisn = '1234567891'
  AND NOT EXISTS (SELECT 1 FROM absensi a WHERE a.siswa_id = s.id AND a.tanggal = CURRENT_DATE);

INSERT INTO absensi (siswa_id, kelas_id, tanggal, status, keterangan)
SELECT s.id, s.kelas_id, CURRENT_DATE - 1, 'Sakit', 'Demam'
FROM siswa s
WHERE s.nisn = '1234567892'
  AND NOT EXISTS (SELECT 1 FROM absensi a WHERE a.siswa_id = s.id AND a.tanggal = CURRENT_DATE - 1);

-- ============================================================
-- SEED: Sample komite
-- ============================================================
INSERT INTO komite (siswa_id, jenis_iuran, nominal, tanggal_bayar, status, keterangan)
SELECT s.id, 'Bulanan', 50000, CURRENT_DATE, 'Lunas', 'Iuran Bulan Ini'
FROM siswa s
WHERE s.nisn = '1234567891'
  AND NOT EXISTS (SELECT 1 FROM komite k WHERE k.siswa_id = s.id AND k.jenis_iuran = 'Bulanan');

INSERT INTO komite (siswa_id, jenis_iuran, nominal, tanggal_bayar, status, keterangan)
SELECT s.id, 'Bulanan', 50000, NULL, 'Belum Lunas', ''
FROM siswa s
WHERE s.nisn = '1234567892'
  AND NOT EXISTS (SELECT 1 FROM komite k WHERE k.siswa_id = s.id AND k.jenis_iuran = 'Bulanan');

-- ============================================================
-- SEED: Sample nilai
-- ============================================================
INSERT INTO nilai (siswa_id, mata_pelajaran, jenis_nilai, nilai, semester)
SELECT s.id, 'Matematika', 'Harian', 85, 'Ganjil 2024/2025'
FROM siswa s
WHERE s.nisn = '1234567891'
  AND NOT EXISTS (SELECT 1 FROM nilai n WHERE n.siswa_id = s.id AND n.mata_pelajaran = 'Matematika' AND n.jenis_nilai = 'Harian');

INSERT INTO nilai (siswa_id, mata_pelajaran, jenis_nilai, nilai, semester)
SELECT s.id, 'Matematika', 'UTS', 78, 'Ganjil 2024/2025'
FROM siswa s
WHERE s.nisn = '1234567891'
  AND NOT EXISTS (SELECT 1 FROM nilai n WHERE n.siswa_id = s.id AND n.mata_pelajaran = 'Matematika' AND n.jenis_nilai = 'UTS');

INSERT INTO nilai (siswa_id, mata_pelajaran, jenis_nilai, nilai, semester)
SELECT s.id, 'Bahasa Indonesia', 'Harian', 90, 'Ganjil 2024/2025'
FROM siswa s
WHERE s.nisn = '1234567892'
  AND NOT EXISTS (SELECT 1 FROM nilai n WHERE n.siswa_id = s.id AND n.mata_pelajaran = 'Bahasa Indonesia' AND n.jenis_nilai = 'Harian');