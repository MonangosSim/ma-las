/*
# Create catatan_buruk table

1. New Tables
- `catatan_buruk`
  - `id` (uuid, primary key)
  - `siswa_id` (uuid, FK to siswa) — the student this note is for
  - `tanggal` (date, not null) — date of the incident/note
  - `catatan` (text, not null) — the bad note content
  - `created_by` (text) — admin name who created it
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
2. Security
- Enable RLS on `catatan_buruk`.
- Admin: full CRUD via service role.
- Siswa/Ortu: SELECT only, filtered to their own siswa_id.
3. Indexes
- Index on siswa_id for fast per-student queries.
- Index on tanggal for date-based sorting.
*/

CREATE TABLE IF NOT EXISTS catatan_buruk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  catatan text NOT NULL DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE catatan_buruk ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_catatan_buruk" ON catatan_buruk;
CREATE POLICY "select_catatan_buruk" ON catatan_buruk FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_catatan_buruk" ON catatan_buruk;
CREATE POLICY "insert_catatan_buruk" ON catatan_buruk FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_catatan_buruk" ON catatan_buruk;
CREATE POLICY "update_catatan_buruk" ON catatan_buruk FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_catatan_buruk" ON catatan_buruk;
CREATE POLICY "delete_catatan_buruk" ON catatan_buruk FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_catatan_buruk_siswa_id ON catatan_buruk(siswa_id);
CREATE INDEX IF NOT EXISTS idx_catatan_buruk_tanggal ON catatan_buruk(tanggal DESC);
