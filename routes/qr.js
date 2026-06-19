const express = require('express');
const QRCode = require('qrcode');
const qrStore = require('../qrStore');
const { requireAuth, requireRoles } = require('../middleware/auth');
const router = express.Router();

// Gerar QR code sem tempo limite - apenas invalida quando lido
router.post(
  '/generate',
  requireAuth,
  requireRoles(['SONOPLASTA', 'DIRETOR', 'ADMIN']),
  (req, res) => {
  try {
    console.error('=== QR GENERATE REQUEST ===');
    console.error('User:', req.user);
    const { token, uploadUrl } = qrStore.createQr({
      protocol: req.protocol,
      host: req.get('host'),
      createdBy: req.user.id
    });
    console.error('Token gerado:', token);
    console.error('Upload URL:', uploadUrl);
    
    // Gerar QR code como imagem base64
    QRCode.toDataURL(uploadUrl, (err, url) => {
      if (err) {
        console.error('Erro ao gerar QR code:', err);
        return res.status(500).json({ error: 'Erro ao gerar QR code' });
      }
      
      console.error('QR Code gerado com sucesso');
      res.json({
        qrCode: url,
        token: token
      });
    });
    
  } catch (error) {
    console.error('Erro no generate QR:', error);
    res.status(500).json({ error: 'Erro ao gerar QR code' });
  }
});

// Verificar se QR code é válido
router.get('/verify/:token', (req, res) => {
  const { token } = req.params;
  const result = qrStore.verify(token);
  if (!result.valid) return res.json({ valid: false, reason: result.reason });
  res.json({ valid: true, uploadUrl: result.data.uploadUrl });
});

// Marcar QR code como utilizado (invalidar imediatamente)
router.post('/use/:token', (req, res) => {
  const { token } = req.params;
  const result = qrStore.markUsed(token);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json({ success: true, message: 'QR code utilizado com sucesso', uploadUrl: result.data.uploadUrl });
});

// Rota para obter status do QR code
router.get('/status/:token', requireAuth, (req, res) => {
  const { token } = req.params;
  res.json(qrStore.status(token, { userId: req.user.id }));
});

module.exports = router;
