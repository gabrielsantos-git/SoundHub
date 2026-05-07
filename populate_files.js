// Script para popular o banco de dados com os arquivos de mídia existentes
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);
const uploadsDir = './uploads';

async function populateFiles() {
    try {
        console.log('Verificando arquivos na pasta uploads...');
        
        // Ler arquivos da pasta uploads
        const files = fs.readdirSync(uploadsDir);
        console.log(`Arquivos encontrados: ${files.length}`);
        
        // Inserir cada arquivo no banco de dados
        files.forEach((file, index) => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            
            // Determinar o tipo do arquivo
            const ext = path.extname(file).toLowerCase();
            let tipo = 'outro';
            
            if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
                tipo = 'imagem';
            } else if (['.mp4', '.avi', '.mov', '.wmv', '.mkv'].includes(ext)) {
                tipo = 'video';
            } else if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
                tipo = 'documento';
            } else if (['.mp3', '.wav', '.ogg', '.flac'].includes(ext)) {
                tipo = 'audio';
            }
            
            // Inserir no banco de dados
            db.run(
                `INSERT INTO files (nome, caminho, tipo, tamanho, data_upload, usuario_id, usuario_nome, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    file,
                    filePath,
                    tipo,
                    stats.size,
                    new Date().toISOString(),
                    1, // ID do usuário admin
                    'Administrador SoundHub',
                    'APPROVED' // Aprovar automaticamente para testes
                ],
                function(err) {
                    if (err) {
                        console.error(`Erro ao inserir arquivo ${file}:`, err);
                    } else {
                        console.log(`✅ Arquivo inserido: ${file} (${tipo})`);
                    }
                }
            );
        });
        
        console.log('População de arquivos concluída!');
        
    } catch (error) {
        console.error('Erro ao popular arquivos:', error);
    } finally {
        // Fechar conexão após 2 segundos
        setTimeout(() => {
            db.close();
            console.log('Conexão com banco fechada.');
        }, 2000);
    }
}

populateFiles();
