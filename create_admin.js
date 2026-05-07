// Script para criar usuário admin@soundhub.com com status APPROVED
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

async function createAdminUser() {
    try {
        console.log('Verificando se usuário admin já existe...');
        
        // Verificar se usuário admin já existe
        db.get("SELECT * FROM users WHERE email = ?", ['admin@soundhub.com'], async (err, user) => {
            if (err) {
                console.error('Erro ao verificar usuário admin:', err);
                return;
            }
            
            if (user) {
                console.log('Usuário admin já existe!');
                console.log('Status atual:', user.status);
                console.log('Cargo atual:', user.cargo);
                
                // Atualizar status para APPROVED se não estiver
                if (user.status !== 'APPROVED') {
                    db.run("UPDATE users SET status = 'APPROVED' WHERE email = ?", ['admin@soundhub.com'], (err) => {
                        if (err) {
                            console.error('Erro ao atualizar status:', err);
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
                        console.log('Usuário admin criado com sucesso!');
                        console.log('Email: admin@soundhub.com');
                        console.log('Senha: admin123');
                        console.log('Status: APPROVED');
                        console.log('Cargo: ADMIN');
                    }
                }
            );
        });
        
    } catch (error) {
        console.error('Erro no script:', error);
    } finally {
        // Fechar conexão após 2 segundos
        setTimeout(() => {
            db.close();
            console.log('Conexão com banco fechada.');
        }, 2000);
    }
}

createAdminUser();
