/*
# Add mata_pelajaran table + materi table + storage bucket for PPT files

## Overview
1. `mata_pelajaran` — dedicated table for subjects (so Nilai uses a dropdown, not free text)
2. `materi` — metadata for uploaded PPT/teaching material files (file stored in Supabase Storage)
3. Storage bucket `materi-files` for file storage
*/

-- ============================================================
-- TABLE: mata_pelajaran (Subjects)
-- ============================================================
CREATE TABLE IF NOT EXISTS mata_pelajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text UNIQUE NOT NULL,
  kode text DEFAULT '',
  keterangan text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE mata_pelajaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mata_pelajaran_select_authenticated" ON mata_pelajaran;
CREATE POLICY "mata_pelajaran_select_authenticated" ON mata_pelajaran FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mata_pelajaran_insert_authenticated" ON mata_pelajaran;
CREATE POLICY "mata_pelajaran_insert_authenticated" ON mata_pelajaran FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mata_pelajaran_update_authenticated" ON mata_pelajaran;
CREATE POLICY "mata_pelajaran_update_authenticated" ON mata_pelajaran FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mata_pelajaran_delete_authenticated" ON mata_pelajaran;
CREATE POLICY "mata_pelajaran_delete_authenticated" ON mata_pelajaran FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TABLE: materi (Teaching material files — PPT, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS materi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mata_pelajaran_id uuid REFERENCES mata_pelajaran(id) ON DELETE SET NULL,
  judul text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text DEFAULT '',
  uploaded_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE materi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "materi_select_authenticated" ON materi;
CREATE POLICY "materi_select_authenticated" ON materi FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "materi_insert_authenticated" ON materi;
CREATE POLICY "materi_insert_authenticated" ON materi FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "materi_delete_authenticated" ON materi;
CREATE POLICY "materi_delete_authenticated" ON materi FOR DELETE TO authenticated USING (true);

-- ============================================================
-- STORAGE BUCKET: materi-files
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('materi-files', 'materi-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow authenticated users to upload/download/manage
DROP POLICY IF EXISTS "materi_files_read_authenticated" ON storage.objects;
CREATE POLICY "materi_files_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'materi-files');

DROP POLICY IF EXISTS "materi_files_write_authenticated" ON storage.objects;
CREATE POLICY "materi_files_write_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materi-files');

DROP POLICY IF EXISTS "materi_files_delete_authenticated" ON storage.objects;
CREATE POLICY "materi_files_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'materi-files');

-- ============================================================
-- SEED: Sample mata_pelajaran
-- ============================================================
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Matematika', 'MAT', 'Matematika umum' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Matematika');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Bahasa Indonesia', 'BIN', 'Bahasa Indonesia' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Bahasa Indonesia');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Bahasa Inggris', 'BIG', 'Bahasa Inggris' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Bahasa Inggris');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Fisika', 'FIS', 'Ilmu Fisika' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Fisika');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Kimia', 'KIM', 'Ilmu Kimia' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Kimia');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Biologi', 'BIO', 'Ilmu Biologi' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Biologi');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Sejarah', 'SEJ', 'Ilmu Sejarah' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Sejarah');
INSERT INTO mata_pelajaran (nama, kode, keterangan)
SELECT 'Geografi', 'GEO', 'Ilmu Geografi' WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = 'Geografi');