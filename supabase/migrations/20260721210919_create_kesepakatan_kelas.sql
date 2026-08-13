/*
# Create kesepakatan_kelas table

## Overview
Adds a `kesepakatan_kelas` table to record class agreements (kesepakatan kelas)
for each kelas, scoped by tahun ajaran and semester.

## New Table: kesepakatan_kelas
- id (uuid PK)
- kelas_id (uuid, FK to kelas, NOT NULL)
- tahun_ajaran_id (uuid, FK to tahun_ajaran, nullable)
- semester (text, default '')
- judul (text, NOT NULL) — title of the agreement
- isi (text, NOT NULL) — full text of the agreement
- tanggal_dibuat (date, NOT NULL) — date the agreement was made
- created_at, updated_at (timestamptz)

## Security
- RLS enabled, authenticated-only CRUD (same pattern as other tables)
*/

CREATE TABLE IF NOT EXISTS kesepakatan_kelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id uuid NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL,
  semester text NOT NULL DEFAULT '',
  judul text NOT NULL,
  isi text NOT NULL,
  tanggal_dibuat date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kesepakatan_kelas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kesepakatan_kelas_select_authenticated" ON kesepakatan_kelas;
CREATE POLICY "kesepakatan_kelas_select_authenticated" ON kesepakatan_kelas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "kesepakatan_kelas_insert_authenticated" ON kesepakatan_kelas;
CREATE POLICY "kesepakatan_kelas_insert_authenticated" ON kesepakatan_kelas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "kesepakatan_kelas_update_authenticated" ON kesepakatan_kelas;
CREATE POLICY "kesepakatan_kelas_update_authenticated" ON kesepakatan_kelas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "kesepakatan_kelas_delete_authenticated" ON kesepakatan_kelas;
CREATE POLICY "kesepakatan_kelas_delete_authenticated" ON kesepakatan_kelas FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_kesepakatan_kelas_kelas_id ON kesepakatan_kelas(kelas_id);
CREATE INDEX IF NOT EXISTS idx_kesepakatan_kelas_tahun_ajaran_id ON kesepakatan_kelas(tahun_ajaran_id);
CREATE INDEX IF NOT EXISTS idx_kesepakatan_kelas_semester ON kesepakatan_kelas(semester);