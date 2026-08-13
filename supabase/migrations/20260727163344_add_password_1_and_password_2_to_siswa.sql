/*
# Add password_1 and password_2 fields to siswa table

1. Schema Changes
   - Add `password_1` (text, NOT NULL DEFAULT '') — password for SISWA login
   - Add `password_2` (text, NOT NULL DEFAULT '') — password for ORANG TUA login
   - Migrate existing `password_hash` data into `password_1` so current siswa can still log in
2. Login Validation Logic (implemented in edge function)
   - Step 1: Validate against `password_1`. If it exists and matches → login as SISWA.
   - Step 2: Validate against `password_2`. If it exists and matches → login as ORANG TUA.
   - Step 3: If neither matches → show "Username dan Password Salah".
3. Important Notes
   - `password_hash` column is kept (NOT dropped) for backwards compatibility.
   - Default `password_1` for new siswa = hash of NISN.
   - `password_2` defaults to empty (ortu login disabled until admin sets it).
*/

ALTER TABLE siswa ADD COLUMN IF NOT EXISTS password_1 text NOT NULL DEFAULT '';
ALTER TABLE siswa ADD COLUMN IF NOT EXISTS password_2 text NOT NULL DEFAULT '';

-- Migrate existing password_hash → password_1
UPDATE siswa SET password_1 = password_hash WHERE password_1 = '' AND password_hash != '';
