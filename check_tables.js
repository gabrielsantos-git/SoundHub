const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
    if (err) {
        console.error('Erro:', err);
    } else {
        console.log('Tabelas encontradas:', tables.map(t => t.name));
    }
    db.close();
});
