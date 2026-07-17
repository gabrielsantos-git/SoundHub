-- Migração: suporte a upload em fragmentos (chunked upload)
-- Executar no Supabase SQL Editor

ALTER TABLE files ADD COLUMN IF NOT EXISTS is_chunked   BOOLEAN DEFAULT FALSE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS chunk_paths  TEXT[]  DEFAULT '{}';
