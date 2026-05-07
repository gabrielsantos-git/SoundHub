// Script para criar um usuário de teste com cargo SONOPLASTA
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

async function createSonoplastaUser() {
    try {
        console.log('Criando usuário SONOPLASTA de teste...');
        
        // Verificar se usuário já existe
        db.get("SELECT * FROM users WHERE email = ?", ['sonoplasta@soundhub.com'], async (err, user) => {
            if (err) {
                console.error('Erro ao verificar usuário SONOPLASTA:', err);
                return;
            }
            
            if (user) {
                console.log('Usuário SONOPLASTA já existe!');
                console.log('Status atual:', user.status);
                console.log('ID:', user.id);
                return;
            }
            
            // Criar usuário SONOPLASTA
            console.log('Criando usuário sonoplasta@soundhub.com...');
            
            const hashedPassword = await bcrypt.hash('sonoplasta123', 10);
            
            db.run(
                `INSERT INTO users (nome, email, senha, cargo, status, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)`,
                ['Sonoplasta Teste', 'sonoplasta@soundhub.com', hashedPassword, 'SONOPLASTA', 'APPROVED', new Date().toISOString()],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar usuário SONOPLASTA:', err);
                    } else {
                        console.log('✅ Usuário SONOPLASTA criado com sucesso!');
                        console.log('   Email: sonoplasta@soundhub.com');
                        console.log('   Senha: sonoplasta123');
                        console.log('   Cargo: SONOPLASTA');
                        console.log('   Status: APPROVED');
                        console.log('   ID:', this.lastID);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Erro ao criar usuário SONOPLASTA:', error);
    }
}

createSonoplastaUser();
