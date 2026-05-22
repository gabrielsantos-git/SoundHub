const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../supabase');
const archiver = require('archiver');
const router = express.Router();

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// Middleware de tratamento de erro do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Erro do Multer:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Número de arquivos excedido.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de arquivo inesperado.' });
    }
    return res.status(400).json({ error: 'Erro no upload: ' + error.message });
  } else if (error) {
    console.error('Erro no upload:', error);
    return res.status(500).json({ error: 'Erro interno no upload.' });
  }
  next();
});

// Upload de múltiplos arquivos
router.post('/upload', upload.array('arquivos'), async (req, res) => {
  try {
    console.log('Upload iniciado, req.files:', req.files ? req.files.length : 'null');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { nome, descricao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    console.log('Processando', req.files.length, 'arquivos para o autor:', nome);

    // Salvar múltiplos arquivos no banco de dados
    const savedFiles = [];
    let hasError = false;

    // Processar cada arquivo
    for (const file of req.files) {
      const filePath = `/uploads/${file.filename}`;
      
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO files (nome, caminho, tipo, tamanho, usuario_nome, status, data_upload) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              file.originalname, // Nome original do arquivo
              filePath,
              file.mimetype,
              file.size,
              nome, // Nome do autor (do formulário)
              'PENDING',
              new Date().toISOString()
            ],
            function(err) {
              if (err) {
                console.error('Erro ao salvar arquivo no banco:', err);
                reject(err);
              } else {
                savedFiles.push({
                  id: this.lastID,
                  nome: file.originalname,
                  status: 'PENDING'
                });
                resolve();
              }
            }
          );
        });
      } catch (error) {
        hasError = true;
        // Remover arquivo em caso de erro
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Erro ao remover arquivo:', unlinkError);
        }
        break;
      }
    }

    if (hasError) {
      return res.status(500).json({ error: 'Erro ao salvar um ou mais arquivos' });
    }

    res.json({
      message: `${savedFiles.length} arquivo(s) enviado(s) com sucesso! Aguarde aprovação.`,
      files: savedFiles
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    // Remover todos os arquivos em caso de erro
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Erro ao remover arquivo:', unlinkError);
        }
      });
    }
    res.status(500).json({ error: 'Erro ao fazer upload dos arquivos' });
  }
});

// Listar arquivos
router.get('/', (req, res) => {
  try {
    db.all(
      "SELECT * FROM files WHERE status = 'APPROVED' ORDER BY data_upload DESC",
      (err, files) => {
        if (err) {
          console.error('Erro ao listar arquivos:', err);
          return res.status(500).json({ error: 'Erro ao listar arquivos' });
        }
        
        // Construir URLs completas para os arquivos
        const filesWithUrls = files.map(file => ({
          ...file,
          caminho: `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.caminho)}`
        }));
        
        res.json(filesWithUrls);
      }
    );
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Listar arquivos pendentes
router.get('/pending', (req, res) => {
  try {
    db.all(
      "SELECT * FROM files WHERE status = 'PENDING' ORDER BY data_upload DESC",
      (err, files) => {
        if (err) {
          console.error('Erro ao listar arquivos pendentes:', err);
          return res.status(500).json({ error: 'Erro ao listar arquivos' });
        }
        
        res.json(files);
      }
    );
  } catch (error) {
    console.error('Erro ao listar arquivos pendentes:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Listar arquivos aprovados
router.get('/approved', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('status', 'APPROVED')
      .order('data_upload', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar arquivos aprovados:', error);
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
    
    res.json(files || []);
  } catch (error) {
    console.error('Erro ao listar arquivos aprovados:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Aprovar arquivo
router.patch('/:id/approve', (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    db.run(
      "UPDATE files SET status = 'APPROVED', aprovado_em = ? WHERE id = ?",
      [new Date().toISOString(), fileId],
      function(err) {
        if (err) {
          console.error('Erro ao aprovar arquivo:', err);
          return res.status(500).json({ error: 'Erro ao aprovar arquivo' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Arquivo não encontrado' });
        }
        
        res.json({
          message: 'Arquivo aprovado com sucesso',
          file: {
            id: fileId,
            status: 'APPROVED'
          }
        });
      }
    );
    
  } catch (error) {
    console.error('Erro ao aprovar arquivo:', error);
    res.status(500).json({ error: 'Erro ao aprovar arquivo' });
  }
});

// Rejeitar arquivo
router.patch('/:id/reject', (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    db.run(
      "UPDATE files SET status = 'REJECTED', rejeitado_em = ? WHERE id = ?",
      [new Date().toISOString(), fileId],
      function(err) {
        if (err) {
          console.error('Erro ao rejeitar arquivo:', err);
          return res.status(500).json({ error: 'Erro ao rejeitar arquivo' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Arquivo não encontrado' });
        }
        
        res.json({
          message: 'Arquivo rejeitado com sucesso',
          file: {
            id: fileId,
            status: 'REJECTED'
          }
        });
      }
    );
    
  } catch (error) {
    console.error('Erro ao rejeitar arquivo:', error);
    res.status(500).json({ error: 'Erro ao rejeitar arquivo' });
  }
});

// Download de arquivo
router.get('/download/:id', (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    db.get("SELECT * FROM files WHERE id = ?", [fileId], (err, file) => {
      if (err) {
        console.error('Erro ao buscar arquivo:', err);
        return res.status(500).json({ error: 'Erro ao buscar arquivo' });
      }
      
      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }
      
      // Construir caminho completo do arquivo
      const filePath = path.join(__dirname, '..', file.caminho);
      
      // Verificar se o arquivo existe no sistema de arquivos
      if (!fs.existsSync(filePath)) {
        console.error('Arquivo não encontrado no disco:', filePath);
        return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
      }
      
      // Enviar arquivo para download
      res.download(filePath, file.nome, (downloadErr) => {
        if (downloadErr) {
          console.error('Erro no download:', downloadErr);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
          }
        }
      });
    });
    
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
  }
});

// Download de múltiplos arquivos como ZIP
router.post('/download-zip', (req, res) => {
  try {
    const { fileIds, groupName } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'IDs de arquivos inválidos' });
    }

    // Buscar informações dos arquivos no banco
    const placeholders = fileIds.map(() => '?').join(',');
    const query = `SELECT * FROM files WHERE id IN (${placeholders}) AND status = 'APPROVED'`;
    
    db.all(query, fileIds, (err, files) => {
      if (err) {
        console.error('Erro ao buscar arquivos:', err);
        return res.status(500).json({ error: 'Erro ao buscar arquivos' });
      }
      
      if (files.length === 0) {
        return res.status(404).json({ error: 'Nenhum arquivo encontrado' });
      }

      // Verificar se todos os arquivos existem no sistema de arquivos
      const existingFiles = [];
      for (const file of files) {
        const filePath = path.join(__dirname, '..', file.caminho);
        if (fs.existsSync(filePath)) {
          existingFiles.push(file);
        } else {
          console.warn('Arquivo não encontrado no disco:', file.caminho);
        }
      }

      if (existingFiles.length === 0) {
        return res.status(404).json({ error: 'Nenhum arquivo encontrado no servidor' });
      }

      // Criar arquivo ZIP
      const zipName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;
      res.attachment(zipName);
      
      const archive = archiver('zip', {
        zlib: { level: 9 } // Máxima compressão
      });

      // Tratamento de erros do archiver
      archive.on('error', (err) => {
        console.error('Erro no archiver:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao criar arquivo ZIP' });
        }
      });

      // Enviar o arquivo ZIP para o cliente
      archive.pipe(res);

      // Adicionar cada arquivo ao ZIP
      existingFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file.caminho);
        archive.file(filePath, { name: file.nome });
      });

      // Finalizar o arquivo ZIP
      archive.finalize();
    });
    
  } catch (error) {
    console.error('Erro no download em grupo:', error);
    res.status(500).json({ error: 'Erro ao fazer download dos arquivos' });
  }
});

module.exports = router;
