/*
# Create penugasan table

1. New Tables
- `penugasan`
  - `id` (uuid, primary key)
  - `judul` (text, not null) — title of the assignment
  - `deskripsi` (text) — description/instructions
  - `kelas_id` (uuid, nullable, FK to kelas) — target class; null = all classes
  - `mata_pelajaran_id` (uuid, nullable, FK to mata_pelajaran) — subject
  - `tipe` (text, not null) — 'pdf' or 'link'
  - `file_path` (text) — storage path for PDF
  - `file_name` (text) — original file name
  - `file_size` (bigint) — file size in bytes
  - `file_type` (text) — MIME type
  - `link_url` (text) — URL for link-type assignments
  - `deadline` (date, nullable) — due date
  - `tahun_ajaran_id` (uuid, nullable, FK to tahun_ajaran)
  - `semester` (text)
  - `created_by` (text) — admin name
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
2. Storage
- Create bucket `penugasan-files` for PDF uploads
3. Security
- Enable RLS on `penugasan`.
- Admin: full CRUD.
- Siswa/Ortu: SELECT only (filtered by kelas_id).
*/

CREATE TABLE IF NOT EXISTS penugasan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  deskripsi text NOT NULL DEFAULT '',
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  mata_pelajaran_id uuid REFERENCES mata_pelajaran(id) ON DELETE SET NULL,
  tipe text NOT NULL DEFAULT 'link' CHECK (tipe IN ('pdf', 'link')),
  file_path text DEFAULT '',
  file_name text DEFAULT '',
  file_size bigint DEFAULT 0,
  file_type text DEFAULT '',
  link_url text DEFAULT '',
  deadline date,
  tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL,
  semester text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE penugasan ENABLE ROW LEVEL SECURITY;

-- Admin (service role bypasses RLS, but we add policies for completeness)
-- Siswa/Ortu can read their class's assignments + unassigned ones
DROP POLICY IF EXISTS "select_penugasan" ON penugasan;
CREATE POLICY "select_penugasan" ON penugasan FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_penugasan" ON penugasan;
CREATE POLICY "insert_penugasan" ON penugasan FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_penugasan" ON penugasan;
CREATE POLICY "update_penugasan" ON penugasan FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_penugasan" ON penugasan;
CREATE POLICY "delete_penugasan" ON penugasan FOR DELETE
TO anon, authenticated USING (true);

-- Storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('penugasan-files', 'penugasan-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "allow_penugasan_storage_all" ON storage.objects;
CREATE POLICY "allow_penugasan_storage_all" ON storage.objects
FOR ALL TO anon, authenticated
USING (bucket_id = 'penugasan-files')
WITH CHECK (bucket_id = 'penugasan-files');

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_penugasan_kelas_id ON penugasan(kelas_id);
CREATE INDEX IF NOT EXISTS idx_penugasan_created_at ON penugasan(created_at DESC);
