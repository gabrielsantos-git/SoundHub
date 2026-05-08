-- Tabelas SQL para Supabase (PostgreSQL)
-- SoundHub - Sistema de organização e projeção de mídia para igrejas

-- 1. Tabela users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cargo VARCHAR(50) NOT NULL CHECK(cargo IN ('USUARIO', 'DIRETOR', 'ADMIN', 'SONOPLASTA')),
    status VARCHAR(50) NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    data_cadastro TIMESTAMP NOT NULL DEFAULT NOW(),
    aprovado_em TIMESTAMP,
    rejeitado_em TIMESTAMP
);

-- 2. Tabela files
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    caminho VARCHAR(500) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    tamanho INTEGER,
    data_upload TIMESTAMP DEFAULT NOW(),
    usuario_id INTEGER REFERENCES users(id),
    usuario_nome VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    aprovado_em TIMESTAMP,
    rejeitado_em TIMESTAMP
);

-- 3. Tabela qrcodes
CREATE TABLE qrcodes (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    expiracao TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabela escalas
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK(tipo IN ('semanal', 'mensal', 'evento')),
    data_inicio DATE,
    data_fim DATE,
    criado_por INTEGER NOT NULL REFERENCES users(id),
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 5. Tabela escala_dias
CREATE TABLE escala_dias (
    id SERIAL PRIMARY KEY,
    escala_id INTEGER NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
    dia_semana VARCHAR(50) NOT NULL CHECK(dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
    data_especifica DATE,
    usuario_id INTEGER NOT NULL REFERENCES users(id)
);

-- 6. Tabela eventos
CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    criado_por INTEGER NOT NULL REFERENCES users(id),
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 7. Índices recomendados
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_files_usuario_id ON files(usuario_id);
CREATE INDEX idx_escalas_criado_por ON escalas(criado_por);
CREATE INDEX idx_escala_dias_escala_id ON escala_dias(escala_id);
CREATE INDEX idx_escala_dias_usuario_id ON escala_dias(usuario_id);
CREATE INDEX idx_eventos_criado_por ON eventos(criado_por);

-- 8. Inserir usuário admin (senha: admin123)
INSERT INTO users (nome, email, senha, cargo, status, data_cadastro) 
VALUES ('Administrador SoundHub', 'admin@soundhub.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN', 'APPROVED', NOW());
