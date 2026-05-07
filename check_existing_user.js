// Script para verificar se o email gss130610@gmail.com já existe no banco
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

async function checkExistingUser() {
    try {
        console.log('🔍 Verificando se gss130610@gmail.com já existe no banco...');
        
        // Verificar se o email existe
        db.get("SELECT * FROM users WHERE email = ?", ['gss130610@gmail.com'], (err, user) => {
            if (err) {
                console.error('Erro ao consultar usuário:', err);
                return;
            }
            
            if (user) {
                console.log('✅ USUÁRIO ENCONTRADO:');
                console.log('   ID:', user.id);
                console.log('   Nome:', user.nome);
                console.log('   Email:', user.email);
                console.log('   Cargo:', user.cargo);
                console.log('   Status:', user.status);
                console.log('   Data Cadastro:', user.data_cadastro);
                
                // Verificar se o status está vazio ou nulo
                if (!user.status || user.status === '') {
                    console.log('⚠️  STATUS VAZIO! Este usuário não aparecerá em nenhuma lista.');
                }
            } else {
                console.log('❌ Email gss130610@gmail.com NÃO encontrado no banco.');
            }
            
            // Listar todos os usuários com status problemáticos
            console.log('\n🔍 Verificando usuários com status problemáticos...');
            db.all("SELECT id, nome, email, status FROM users WHERE status IS NULL OR status = '' OR status NOT IN ('PENDING', 'APPROVED', 'REJECTED')", [], (err, users) => {
                if (err) {
                    console.error('Erro ao consultar usuários problemáticos:', err);
                    return;
                }
                
                if (users.length > 0) {
                    console.log('⚠️  USUÁRIOS COM STATUS PROBLEMÁTICO:');
                    users.forEach(user => {
                        console.log(`   ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Status: "${user.status}"`);
                    });
                } else {
                    console.log('✅ Nenhum usuário com status problemático encontrado.');
                }
                
                db.close();
            });
        });
        
    } catch (error) {
        console.error('Erro ao verificar usuário:', error);
    }
}

checkExistingUser();
