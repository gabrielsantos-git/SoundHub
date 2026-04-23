const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { authMiddleware, roleCheck } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas JPG, PNG, MP4 e PDF são aceitos.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB
  },
  fileFilter: fileFilter
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { token, usuarioNome } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token é obrigatório.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo é obrigatório.' });
    }

    const QRCode = require('../models/QRCode');
    const qrCode = await QRCode.findByToken(token);
    
    if (!qrCode) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    await QRCode.markAsUsed(token);

    const fileData = {
      nome: req.file.originalname,
      caminho: req.file.filename,
      tipo: req.file.mimetype,
      tamanho: req.file.size,
      usuario_id: null,
      usuario_nome: usuarioNome || 'Anônimo'
    };

    const file = await File.create(fileData);

    res.status(201).json({
      message: 'Arquivo enviado com sucesso. Aguardando aprovação.',
      file: {
        id: file.id,
        nome: file.nome,
        tipo: file.tipo,
        tamanho: file.tamanho
      }
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
  }
});

router.get('/pending', authMiddleware, roleCheck(['SONOPLASTA', 'DIRETOR']), async (req, res) => {
  try {
    const files = await File.findAll('PENDING');
    res.json(files);
  } catch (error) {
    console.error('Erro ao buscar arquivos pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.get('/approved', authMiddleware, async (req, res) => {
  try {
    const files = await File.findAll('APPROVED');
    res.json(files);
  } catch (error) {
    console.error('Erro ao buscar arquivos aprovados:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.patch('/:id/approve', authMiddleware, roleCheck(['SONOPLASTA', 'DIRETOR']), async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado.' });
    }

    await File.updateStatus(req.params.id, 'APPROVED');
    
    res.json({ message: 'Arquivo aprovado com sucesso.' });
  } catch (error) {
    console.error('Erro ao aprovar arquivo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.patch('/:id/reject', authMiddleware, roleCheck(['SONOPLASTA', 'DIRETOR']), async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado.' });
    }

    await File.updateStatus(req.params.id, 'REJECTED');
    
    res.json({ message: 'Arquivo rejeitado com sucesso.' });
  } catch (error) {
    console.error('Erro ao rejeitar arquivo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.delete('/:id', authMiddleware, roleCheck(['DIRETOR']), async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.caminho);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await File.delete(req.params.id);
    
    res.json({ message: 'Arquivo excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.get('/download/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado.' });
    }

    if (file.status !== 'APPROVED') {
      return res.status(403).json({ message: 'Arquivo não aprovado.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.caminho);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado no servidor.' });
    }

    res.download(filePath, file.nome);
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

module.exports = router;
