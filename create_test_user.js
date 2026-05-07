// Script para criar um usuário de teste com status PENDING
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

async function createTestUser() {
    try {
        console.log('Criando usuário de teste com status PENDING...');
        
        // Verificar se usuário de teste já existe
        db.get("SELECT * FROM users WHERE email = ?", ['teste@soundhub.com'], async (err, user) => {
            if (err) {
                console.error('Erro ao verificar usuário de teste:', err);
                return;
            }
            
            if (user) {
                console.log('Usuário de teste já existe!');
                console.log('Status atual:', user.status);
                console.log('ID:', user.id);
                return;
            }
            
            // Criar usuário de teste
            console.log('Criando usuário teste@soundhub.com...');
            
            const hashedPassword = await bcrypt.hash('teste123', 10);
            
            db.run(
                `INSERT INTO users (nome, email, senha, cargo, status, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)`,
                ['Usuário Teste', 'teste@soundhub.com', hashedPassword, 'USUARIO', 'PENDING', new Date().toISOString()],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar usuário de teste:', err);
                    } else {
                        console.log('✅ Usuário de teste criado com sucesso!');
                        console.log('   Email: teste@soundhub.com');
                        console.log('   Senha: teste123');
                        console.log('   Status: PENDING');
                        console.log('   Cargo: USUARIO');
                        console.log('   ID:', this.lastID);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Erro ao criar usuário de teste:', error);
    }
}

createTestUser();
