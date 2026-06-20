const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../supabase');
const archiver = require('archiver');
const qrStore = require('../qrStore');
const { requireAuth, requireRoles } = require('../middleware/auth');
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
  console.error('=== UPLOAD REQUEST ===');
  console.error('Body:', req.body);
  console.error('Files:', req.files);
  
  const qrToken = req.body?.token;
  console.error('QR Token:', qrToken);
  
  const lockResult = qrToken ? qrStore.lock(qrToken) : { valid: false };
  console.error('Lock result:', lockResult);

  try {
    if (!req.files || req.files.length === 0) {
      console.error('❌ Nenhum arquivo enviado');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!qrToken) {
      console.error('❌ Token do QR Code não fornecido');
      return res.status(400).json({ error: 'Token do QR Code é obrigatório' });
    }

    if (!lockResult.valid) {
      console.error('❌ QR Code inválido ou expirado:', lockResult.reason);
      return res.status(400).json({ error: lockResult.reason || 'QR Code inválido ou expirado' });
    }

    const { nome, descricao } = req.body;
    console.error('Nome:', nome);
    console.error('Descrição:', descricao);

    if (!nome) {
      console.error('❌ Nome não fornecido');
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Salvar múltiplos arquivos no banco de dados
    const savedFiles = [];
    let hasError = false;

    // Processar cada arquivo
    for (const file of req.files) {
      const filePath = `/uploads/${file.filename}`;
      
      try {
        const { data: inserted, error } = await supabase
          .from('files')
          .insert({
            nome: file.originalname,
            caminho: filePath,
            tipo: file.mimetype,
            tamanho: file.size,
            usuario_nome: nome,
            descricao: descricao || '',
            status: 'PENDING',
            data_upload: new Date().toISOString()
          })
          .select('id, nome, status')
          .single();

        if (error) {
          throw error;
        }

        savedFiles.push({
          id: inserted.id,
          nome: inserted.nome,
          status: inserted.status
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

    qrStore.markUsed(qrToken);

    res.json({
      message: `${savedFiles.length} arquivo(s) enviado(s) com sucesso! Aguarde aprovação.`,
      files: savedFiles
    });

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    console.error('Stack trace:', error.stack);
    
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
    res.status(500).json({ error: 'Erro ao fazer upload dos arquivos: ' + error.message });
  } finally {
    if (qrToken) {
      qrStore.unlock(qrToken);
    }
  }
});

// Listar arquivos
router.get('/', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('status', 'APPROVED')
      .order('data_upload', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }

    const filesWithUrls = (files || []).map(file => ({
      ...file,
      caminho: `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.caminho)}`
    }));

    res.json(filesWithUrls);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Listar arquivos pendentes
router.get(
  '/pending',
  requireAuth,
  requireRoles(['SONOPLASTA', 'DIRETOR', 'ADMIN']),
  async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('status', 'PENDING')
      .order('data_upload', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar arquivos pendentes:', error);
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
    
    res.json(files || []);
  } catch (error) {
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
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Aprovar arquivo
router.patch('/:id/approve', requireAuth, requireRoles(['DIRETOR', 'ADMIN']), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const { data, error } = await supabase
      .from('files')
      .update({ status: 'APPROVED', aprovado_em: new Date().toISOString() })
      .eq('id', fileId)
      .select('id, status')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.json({
      message: 'Arquivo aprovado com sucesso',
      file: {
        id: data.id,
        status: data.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar arquivo' });
  }
});

// Rejeitar arquivo
router.patch('/:id/reject', requireAuth, requireRoles(['DIRETOR', 'ADMIN']), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const { data, error } = await supabase
      .from('files')
      .update({ status: 'REJECTED', rejeitado_em: new Date().toISOString() })
      .eq('id', fileId)
      .select('id, status')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.json({
      message: 'Arquivo rejeitado com sucesso',
      file: {
        id: data.id,
        status: data.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar arquivo' });
  }
});

// Download de arquivo
router.get('/download/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const filePath = path.join(__dirname, '..', file.caminho);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    res.download(filePath, file.nome, (downloadErr) => {
      if (downloadErr) {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
  }
});

// Download de múltiplos arquivos como ZIP
router.post('/download-zip', async (req, res) => {
  try {
    const { fileIds, groupName } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'IDs de arquivos inválidos' });
    }

    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .in('id', fileIds)
      .eq('status', 'APPROVED');

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar arquivos' });
    }

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Nenhum arquivo encontrado' });
    }

    const existingFiles = [];
    for (const file of files) {
      const filePath = path.join(__dirname, '..', file.caminho);
      if (fs.existsSync(filePath)) {
        existingFiles.push(file);
      }
    }

    if (existingFiles.length === 0) {
      return res.status(404).json({ error: 'Nenhum arquivo encontrado no servidor' });
    }

    const safeGroupName = String(groupName || 'arquivos').replace(/[^a-zA-Z0-9]/g, '_');
    const zipName = `${safeGroupName}_${Date.now()}.zip`;
    res.attachment(zipName);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao criar arquivo ZIP' });
      }
    });

    archive.pipe(res);

    existingFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file.caminho);
      archive.file(filePath, { name: file.nome });
    });

    archive.finalize();
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer download dos arquivos' });
  }
});

module.exports = router;
