/*
# Add Tahun Ajaran (Academic Year) + Semester support

## Overview
Adds a structured `tahun_ajaran` table to manage academic years (e.g., "2024/2025")
with an `is_active` flag. Adds `tahun_ajaran_id` and `semester` columns to `absensi`,
`komite`, and `nilai` tables so records are scoped to a specific academic year and
semester (Ganjil/Genap).

## New Table: tahun_ajaran
- id (uuid PK)
- nama (text, not null) — e.g., "2024/2025"
- semester_aktif (text, default 'Ganjil') — current active semester: 'Ganjil' or 'Genap'
- is_active (boolean, default false) — only one row should be active at a time
- created_at, updated_at

## Modified Tables
1. `absensi` — add `tahun_ajaran_id` (uuid, nullable, FK) + `semester` (text, default '')
2. `komite` — add `tahun_ajaran_id` (uuid, nullable, FK) + `semester` (text, default '')
3. `nilai` — add `tahun_ajaran_id` (uuid, nullable, FK) + keep existing `semester` text column
   (nilai already has `semester` as free text; we add `tahun_ajaran_id` FK)

## Data Migration
- Create a default tahun_ajaran "2024/2025" and mark it active
- Backfill existing absensi, komite, nilai records with the default tahun_ajaran_id

## Security
- RLS enabled on tahun_ajaran, authenticated-only CRUD
*/

-- ============================================================
-- TABLE: tahun_ajaran
-- ============================================================
CREATE TABLE IF NOT EXISTS tahun_ajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text UNIQUE NOT NULL,
  semester_aktif text NOT NULL DEFAULT 'Ganjil',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE tahun_ajaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tahun_ajaran_select_authenticated" ON tahun_ajaran;
CREATE POLICY "tahun_ajaran_select_authenticated" ON tahun_ajaran FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tahun_ajaran_insert_authenticated" ON tahun_ajaran;
CREATE POLICY "tahun_ajaran_insert_authenticated" ON tahun_ajaran FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tahun_ajaran_update_authenticated" ON tahun_ajaran;
CREATE POLICY "tahun_ajaran_update_authenticated" ON tahun_ajaran FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tahun_ajaran_delete_authenticated" ON tahun_ajaran;
CREATE POLICY "tahun_ajaran_delete_authenticated" ON tahun_ajaran FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Add columns to absensi
-- ============================================================
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL;
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS semester text DEFAULT '';

-- ============================================================
-- Add columns to komite
-- ============================================================
ALTER TABLE komite ADD COLUMN IF NOT EXISTS tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL;
ALTER TABLE komite ADD COLUMN IF NOT EXISTS semester text DEFAULT '';

-- ============================================================
-- Add tahun_ajaran_id to nilai (semester column already exists)
-- ============================================================
ALTER TABLE nilai ADD COLUMN IF NOT EXISTS tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL;

-- ============================================================
-- SEED: Default tahun ajaran + backfill existing data
-- ============================================================
INSERT INTO tahun_ajaran (nama, semester_aktif, is_active)
SELECT '2024/2025', 'Ganjil', true
WHERE NOT EXISTS (SELECT 1 FROM tahun_ajaran WHERE nama = '2024/2025');

-- Ensure only one active row
UPDATE tahun_ajaran SET is_active = false WHERE nama != '2024/2025';
UPDATE tahun_ajaran SET is_active = true WHERE nama = '2024/2025';

-- Backfill existing records with the default tahun_ajaran_id
UPDATE absensi SET tahun_ajaran_id = (SELECT id FROM tahun_ajaran WHERE nama = '2024/2025') WHERE tahun_ajaran_id IS NULL;
UPDATE komite SET tahun_ajaran_id = (SELECT id FROM tahun_ajaran WHERE nama = '2024/2025') WHERE tahun_ajaran_id IS NULL;
UPDATE nilai SET tahun_ajaran_id = (SELECT id FROM tahun_ajaran WHERE nama = '2024/2025') WHERE tahun_ajaran_id IS NULL;

-- Backfill semester for absensi and komite (default to 'Ganjil')
UPDATE absensi SET semester = 'Ganjil' WHERE semester = '';
UPDATE komite SET semester = 'Ganjil' WHERE semester = '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_absensi_tahun_ajaran_id ON absensi(tahun_ajaran_id);
CREATE INDEX IF NOT EXISTS idx_absensi_semester ON absensi(semester);
CREATE INDEX IF NOT EXISTS idx_komite_tahun_ajaran_id ON komite(tahun_ajaran_id);
CREATE INDEX IF NOT EXISTS idx_komite_semester ON komite(semester);
CREATE INDEX IF NOT EXISTS idx_nilai_tahun_ajaran_id ON nilai(tahun_ajaran_id);