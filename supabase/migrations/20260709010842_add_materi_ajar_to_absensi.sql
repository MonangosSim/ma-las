/*
# Add materi_ajar column to absensi table

## Overview
Adds a `materi_ajar` text column to the `absensi` table so the admin/teacher
can record what was taught during the session — used as a teaching journal
(jurnal mengajar) alongside attendance records.

## Changes
1. `absensi` table: new column `materi_ajar` (text, nullable, default empty string).

## Security
- No RLS policy changes needed — the column is covered by existing authenticated policies.
*/

ALTER TABLE absensi ADD COLUMN IF NOT EXISTS materi_ajar text DEFAULT '';