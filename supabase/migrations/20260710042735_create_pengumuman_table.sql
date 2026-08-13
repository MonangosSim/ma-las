/*
# Create pengumuman (announcements) table

## Overview
Admin can create text announcements targeted to:
- All students (no target)
- A specific tingkat (X, XI, or XII)
- A specific kelas (e.g. X IPA 1, XI IPS 1)

Students see relevant announcements on their dashboard.

## New Table: pengumuman
- id (uuid PK)
- judul (text, not null) — announcement title
- isi (text, not null) — announcement body
- tingkat (text, default '') — target tingkat: 'X', 'XI', 'XII', or '' for all
- kelas_id (uuid, FK kelas, nullable) — target specific kelas, or null for all
- created_by (text) — admin name who created it
- created_at (timestamptz)
- updated_at (timestamptz)

## Security
- RLS enabled, authenticated-only CRUD (admin manages, siswa reads via edge function)
*/

CREATE TABLE IF NOT EXISTS pengumuman (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  isi text NOT NULL,
  tingkat text DEFAULT '',
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pengumuman_select_authenticated" ON pengumuman;
CREATE POLICY "pengumuman_select_authenticated" ON pengumuman FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pengumuman_insert_authenticated" ON pengumuman;
CREATE POLICY "pengumuman_insert_authenticated" ON pengumuman FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pengumuman_update_authenticated" ON pengumuman;
CREATE POLICY "pengumuman_update_authenticated" ON pengumuman FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pengumuman_delete_authenticated" ON pengumuman;
CREATE POLICY "pengumuman_delete_authenticated" ON pengumuman FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_pengumuman_created_at ON pengumuman(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pengumuman_tingkat ON pengumuman(tingkat);