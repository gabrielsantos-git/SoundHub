-- Adiciona coluna escala_id em eventos para vincular com escala_dias
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS escala_id INTEGER REFERENCES escalas(id);

-- Para eventos existentes, criar um registro escalas e vincular
DO $$
DECLARE
    ev RECORD;
    nova_escala_id INTEGER;
BEGIN
    FOR ev IN SELECT * FROM eventos WHERE escala_id IS NULL LOOP
        INSERT INTO escalas (nome, tipo, data_inicio, data_fim, criado_por)
        VALUES (ev.nome, 'evento', ev.data_inicio, ev.data_fim, ev.criado_por)
        RETURNING id INTO nova_escala_id;

        UPDATE eventos SET escala_id = nova_escala_id WHERE id = ev.id;
    END LOOP;
END $$;
