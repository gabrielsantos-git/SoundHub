const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const router = express.Router();

// Armazenamento temporário de QR codes (em memória)
const qrCodes = new Map();

// Gerar QR code sem tempo limite - apenas invalida quando lido
router.post('/generate', (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const uploadUrl = `${req.protocol}://${req.get('host')}/upload.html?token=${token}`;
    
    // Armazenar informações do QR code (sem expiração por tempo)
    qrCodes.set(token, {
      token,
      uploadUrl,
      createdAt: Date.now(),
      used: false
    });
    
    // Gerar QR code como imagem base64
    QRCode.toDataURL(uploadUrl, (err, url) => {
      if (err) {
        console.error('Erro ao gerar QR code:', err);
        return res.status(500).json({ error: 'Erro ao gerar QR code' });
      }
      
      res.json({
        qrCode: url,
        token: token
      });
    });
    
  } catch (error) {
    console.error('Erro ao gerar QR code:', error);
    res.status(500).json({ error: 'Erro ao gerar QR code' });
  }
});

// Verificar se QR code é válido
router.get('/verify/:token', (req, res) => {
  const { token } = req.params;
  const qrData = qrCodes.get(token);
  
  if (!qrData) {
    return res.json({ valid: false, reason: 'QR code não encontrado' });
  }
  
  if (qrData.used) {
    return res.json({ valid: false, reason: 'QR code já foi utilizado' });
  }
  
  res.json({ 
    valid: true, 
    uploadUrl: qrData.uploadUrl
  });
});

// Marcar QR code como utilizado (invalidar imediatamente)
router.post('/use/:token', (req, res) => {
  const { token } = req.params;
  const qrData = qrCodes.get(token);
  
  if (!qrData) {
    return res.status(404).json({ error: 'QR code não encontrado' });
  }
  
  if (qrData.used) {
    return res.status(400).json({ error: 'QR code já foi utilizado' });
  }
  
  // Marcar como utilizado
  qrData.used = true;
  qrData.usedAt = Date.now();
  
  console.log(`QR code ${token} foi utilizado e invalidado`);
  
  res.json({ 
    success: true, 
    message: 'QR code utilizado com sucesso',
    uploadUrl: qrData.uploadUrl
  });
});

// Limpar QR codes expirados (executado periodicamente)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, data] of qrCodes.entries()) {
    if (now > data.expiresAt || data.used) {
      qrCodes.delete(token);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Limpos ${cleaned} QR codes expirados/utilizados`);
  }
}, 30000); // Limpar a cada 30 segundos

// Rota para obter status do QR code
router.get('/status/:token', (req, res) => {
  const { token } = req.params;
  const qrData = qrCodes.get(token);
  
  if (!qrData) {
    return res.json({
      token: token,
      valid: false,
      used: true,
      createdAt: null,
      reason: 'QR code não encontrado ou expirou'
    });
  }
  
  res.json({
    token: token,
    valid: !qrData.used,
    used: qrData.used,
    createdAt: qrData.createdAt
  });
});

module.exports = router;
