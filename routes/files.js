const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Mock database - em produção usar banco de dados real
let files = [];
let fileIdCounter = 1;

// Upload de arquivo
router.post('/upload', upload.single('arquivo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { nome, email, descricao } = req.body;

    if (!nome || !email) {
      // Remover arquivo se dados estiverem incompletos
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const fileData = {
      id: fileIdCounter++,
      nome: req.file.filename,
      nome_original: req.file.originalname,
      tamanho: req.file.size,
      tipo: req.file.mimetype,
      usuario_nome: nome,
      usuario_email: email,
      descricao: descricao || '',
      caminho: req.file.path,
      status: 'pending', // pending, approved, rejected
      criado_em: new Date().toISOString()
    };

    files.push(fileData);

    res.json({
      message: 'Arquivo enviado com sucesso',
      file: {
        id: fileData.id,
        nome: fileData.nome_original,
        tamanho: fileData.tamanho,
        tipo: fileData.tipo,
        usuario_nome: fileData.usuario_nome,
        status: fileData.status
      }
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
  }
});

// Listar arquivos pendentes
router.get('/pending', (req, res) => {
  try {
    const pendingFiles = files.filter(file => file.status === 'pending');
    res.json(pendingFiles);
  } catch (error) {
    console.error('Erro ao listar arquivos pendentes:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Listar arquivos aprovados
router.get('/approved', (req, res) => {
  try {
    const approvedFiles = files.filter(file => file.status === 'approved');
    res.json(approvedFiles);
  } catch (error) {
    console.error('Erro ao listar arquivos aprovados:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Aprovar arquivo
router.patch('/:id/approve', (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    if (file.status !== 'pending') {
      return res.status(400).json({ error: 'Arquivo já foi processado' });
    }
    
    file.status = 'approved';
    file.aprovado_em = new Date().toISOString();
    
    res.json({
      message: 'Arquivo aprovado com sucesso',
      file: {
        id: file.id,
        nome: file.nome_original,
        status: file.status
      }
    });
    
  } catch (error) {
    console.error('Erro ao aprovar arquivo:', error);
    res.status(500).json({ error: 'Erro ao aprovar arquivo' });
  }
});

// Rejeitar arquivo
router.patch('/:id/reject', (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    if (file.status !== 'pending') {
      return res.status(400).json({ error: 'Arquivo já foi processado' });
    }
    
    file.status = 'rejected';
    file.rejeitado_em = new Date().toISOString();
    
    // Remover arquivo físico
    if (fs.existsSync(file.caminho)) {
      fs.unlinkSync(file.caminho);
    }
    
    res.json({
      message: 'Arquivo rejeitado com sucesso',
      file: {
        id: file.id,
        nome: file.nome_original,
        status: file.status
      }
    });
    
  } catch (error) {
    console.error('Erro ao rejeitar arquivo:', error);
    res.status(500).json({ error: 'Erro ao rejeitar arquivo' });
  }
});

module.exports = router;
