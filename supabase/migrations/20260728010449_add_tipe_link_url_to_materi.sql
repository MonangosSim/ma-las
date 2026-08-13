-- Add tipe and link_url columns to materi table for link URL support
ALTER TABLE materi ADD COLUMN IF NOT EXISTS tipe text NOT NULL DEFAULT 'file' CHECK (tipe IN ('file', 'link'));
ALTER TABLE materi ADD COLUMN IF NOT EXISTS link_url text NOT NULL DEFAULT '';

-- Backfill existing rows
UPDATE materi SET tipe = 'file' WHERE tipe IS NULL OR tipe = '';
UPDATE materi SET link_url = '' WHERE link_url IS NULL;
