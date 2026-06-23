-- Adicionar coluna 'descricao' à tabela 'files'
ALTER TABLE files ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'files' 
ORDER BY ordinal_position;
