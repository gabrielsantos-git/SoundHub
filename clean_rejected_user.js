// Script para remover usuário rejeitado para permitir novo registro
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

async function cleanRejectedUser() {
    try {
        console.log('🔍 Removendo usuário gss130610@gmail.com (status: REJECTED)...');
        
        // Remover o usuário com email específico
        db.run("DELETE FROM users WHERE email = ?", ['gss130610@gmail.com'], function(err) {
            if (err) {
                console.error('Erro ao remover usuário:', err);
                return;
            }
            
            if (this.changes > 0) {
                console.log('✅ Usuário gss130610@gmail.com removido com sucesso!');
                console.log(`   ${this.changes} linha(s) afetada(s)`);
            } else {
                console.log('❌ Nenhum usuário encontrado para remover.');
            }
            
            // Verificar se o usuário foi realmente removido
            db.get("SELECT * FROM users WHERE email = ?", ['gss130610@gmail.com'], (err, user) => {
                if (err) {
                    console.error('Erro ao verificar remoção:', err);
                    return;
                }
                
                if (user) {
                    console.log('⚠️  ATENÇÃO: Usuário ainda existe no banco!');
                    console.log('   Verifique manualmente o banco de dados.');
                } else {
                    console.log('✅ Confirmação: Usuário não existe mais no banco.');
                }
                
                db.close();
            });
        });
        
    } catch (error) {
        console.error('Erro ao limpar usuário:', error);
    }
}

cleanRejectedUser();
