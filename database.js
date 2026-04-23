const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new sqlite3.Database(path.join(__dirname, '..', dbPath));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      cargo TEXT DEFAULT 'USER' CHECK(cargo IN ('USER', 'SONOPLASTA', 'DIRETOR')),
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      FOREIGN KEY (usuario_id) REFERENCES users (id)
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

  db.get("SELECT COUNT(*) as count FROM users WHERE cargo = 'DIRETOR'", (err, row) => {
    if (!err && row.count === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        "INSERT INTO users (nome, email, senha, cargo, status) VALUES (?, ?, ?, ?, ?)",
        ['Administrador', 'admin@soundhub.com', hashedPassword, 'DIRETOR', 'APPROVED'],
        (err) => {
          if (!err) {
            console.log('Usuário administrador criado: admin@soundhub.com / admin123');
          }
        }
      );
    }
  });
});

module.exports = db;
