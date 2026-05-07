const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new sqlite3.Database(path.join(__dirname, dbPath));

db.serialize(() => {
  // Forçar recriação completa da tabela users
  db.run(`DROP TABLE IF EXISTS users`, (err) => {
    if (err) {
      console.error('Erro ao dropar tabela users:', err);
    }
  });

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      cargo TEXT NOT NULL CHECK(cargo IN ('USUARIO', 'DIRETOR', 'ADMIN', 'SONOPLASTA')),
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      data_cadastro TEXT NOT NULL,
      aprovado_em DATETIME,
      rejeitado_em DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela users:', err);
    } else {
      console.log('Tabela users criada com sucesso!');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      caminho TEXT NOT NULL,
      tipo TEXT NOT NULL,
      tamanho INTEGER,
      data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
      usuario_id INTEGER,
      usuario_nome TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      aprovado_em DATETIME,
      rejeitado_em DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS qrcodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      expiracao DATETIME NOT NULL,
      usado BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabelas para sistema de escalas
  db.run(`
    CREATE TABLE IF NOT EXISTS escalas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('semanal', 'mensal', 'evento')),
      data_inicio DATE,
      data_fim DATE,
      criado_por INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (criado_por) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS escala_dias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      escala_id INTEGER NOT NULL,
      dia_semana TEXT NOT NULL CHECK(dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
      data_especifica DATE,
      usuario_id INTEGER NOT NULL,
      FOREIGN KEY (escala_id) REFERENCES escalas(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      data_inicio DATE NOT NULL,
      data_fim DATE NOT NULL,
      criado_por INTEGER NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (criado_por) REFERENCES users(id)
    )
  `);

  // Adicionar colunas aprovado_em e rejeitado_em se não existirem
  db.run(`ALTER TABLE files ADD COLUMN aprovado_em DATETIME`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna aprovado_em:', err);
    }
  });

  db.run(`ALTER TABLE files ADD COLUMN rejeitado_em DATETIME`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna rejeitado_em:', err);
    }
  });

  // Criar usuário admin automaticamente
  createAdminUser();

  console.log('Banco de dados inicializado com sucesso!');
});

// Função para criar usuário admin
async function createAdminUser() {
  try {
    // Verificar se usuário admin já existe
    db.get("SELECT * FROM users WHERE email = ?", ['admin@soundhub.com'], async (err, user) => {
      if (err) {
        console.error('Erro ao verificar usuário admin:', err);
        return;
      }
      
      if (user) {
        console.log('Usuário admin já existe!');
        console.log('Status atual:', user.status);
        
        // Atualizar status para APPROVED se não estiver
        if (user.status !== 'APPROVED') {
          db.run("UPDATE users SET status = 'APPROVED' WHERE email = ?", ['admin@soundhub.com'], (err) => {
            if (err) {
              console.error('Erro ao atualizar status do admin:', err);
            } else {
              console.log('Status do admin atualizado para APPROVED!');
            }
          });
        }
        return;
      }
      
      // Criar usuário admin
      console.log('Criando usuário admin@soundhub.com...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      db.run(
        `INSERT INTO users (nome, email, senha, cargo, status, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Administrador SoundHub', 'admin@soundhub.com', hashedPassword, 'ADMIN', 'APPROVED', new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('Erro ao criar usuário admin:', err);
          } else {
            console.log('✅ Usuário admin criado com sucesso!');
            console.log('   Email: admin@soundhub.com');
            console.log('   Senha: admin123');
            console.log('   Status: APPROVED');
            console.log('   Cargo: ADMIN');
          }
        }
      );
    });
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
}

module.exports = db;
