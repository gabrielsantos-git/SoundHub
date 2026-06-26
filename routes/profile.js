const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { logAudit, getIp } = require('../utils/audit');
const codes = require('../utils/codeStore');
const { sendPasswordCode, sendEmailOldCode, sendEmailNewCode } = require('../utils/email');
const router = express.Router();

const codeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações de código. Aguarde 10 minutos.' }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/profile
router.get('/', requireAuth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, nome, email, cargo, consentimento_em, politica_versao, data_cadastro')
    .eq('id', req.user.id)
    .single();

  if (error || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // foto_perfil: coluna opcional — só tenta se o ALTER TABLE já foi executado
  try {
    const { data: fotoRow } = await supabase
      .from('users').select('foto_perfil').eq('id', req.user.id).single();
    if (fotoRow?.foto_perfil) {
      const { data: urlData } = await supabase.storage
        .from('avatars').createSignedUrl(fotoRow.foto_perfil, 3600);
      user.foto_url = urlData?.signedUrl || null;
    }
  } catch {}

  res.json(user);
});

// PUT /api/profile/name
router.put('/name', requireAuth, async (req, res) => {
  const nome = req.body?.nome?.trim();
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { data, error } = await supabase
    .from('users').update({ nome }).eq('id', req.user.id).select('nome').single();

  if (error || !data) return res.status(500).json({ error: 'Erro ao atualizar nome' });
  res.json({ nome: data.nome });
});

// POST /api/profile/photo
router.post('/photo', requireAuth, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype))
    return res.status(400).json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' });

  const userId = req.user.id;
  const ext = req.file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : req.file.mimetype.split('/')[1];
  const filePath = `${userId}/avatar.${ext}`;

  const { data: existing } = await supabase.from('users').select('foto_perfil').eq('id', userId).single();
  if (existing?.foto_perfil) await supabase.storage.from('avatars').remove([existing.foto_perfil]);

  const { error: upErr } = await supabase.storage
    .from('avatars').upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (upErr) {
      console.error('Supabase storage upload error:', upErr);
      return res.status(500).json({ error: 'Erro ao enviar foto' });
    }

    await supabase.from('users').update({ foto_perfil: filePath }).eq('id', userId);

    const { data: urlData } = await supabase.storage.from('avatars').createSignedUrl(filePath, 3600);
    res.json({ foto_url: urlData?.signedUrl });
  } catch (e) {
    console.error('Photo upload exception:', e);
    res.status(500).json({ error: 'Erro ao enviar foto' });
  }
});

// POST /api/profile/send-password-code
router.post('/send-password-code', requireAuth, codeLimiter, async (req, res) => {
  const { data: user } = await supabase.from('users').select('email').eq('id', req.user.id).single();
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const code = codes.generate();
  codes.set(`pwd-${req.user.id}`, { code });

  try {
    await sendPasswordCode(user.email, code);
    res.json({ message: 'Código enviado' });
  } catch (e) {
    console.error('SMTP error:', e.message);
    res.status(500).json({ error: 'Erro ao enviar email. Verifique as configurações de SMTP.' });
  }
});

// POST /api/profile/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { code, novaSenha } = req.body;
  if (!code || !novaSenha) return res.status(400).json({ error: 'Código e nova senha são obrigatórios' });
  if (novaSenha.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

  const entry = codes.get(`pwd-${req.user.id}`);
  if (!entry || entry.code !== code) return res.status(400).json({ error: 'Código inválido ou expirado' });

  codes.del(`pwd-${req.user.id}`);
  const hashed = await bcrypt.hash(novaSenha, 10);
  await supabase.from('users').update({ senha: hashed }).eq('id', req.user.id);

  logAudit({ usuarioId: req.user.id, acao: 'PASSWORD_CHANGED', ip: getIp(req) }).catch(() => {});
  res.json({ message: 'Senha alterada com sucesso' });
});

// POST /api/profile/send-email-old-code
router.post('/send-email-old-code', requireAuth, codeLimiter, async (req, res) => {
  const { data: user } = await supabase.from('users').select('email').eq('id', req.user.id).single();
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const code = codes.generate();
  codes.set(`email-old-${req.user.id}`, { code });

  try {
    await sendEmailOldCode(user.email, code);
    res.json({ message: 'Código enviado para seu email atual' });
  } catch (e) {
    console.error('SMTP error:', e.message);
    res.status(500).json({ error: 'Erro ao enviar email.' });
  }
});

// POST /api/profile/verify-email-old
router.post('/verify-email-old', requireAuth, async (req, res) => {
  const { code } = req.body;
  const entry = codes.get(`email-old-${req.user.id}`);
  if (!entry || entry.code !== code) return res.status(400).json({ error: 'Código inválido ou expirado' });

  codes.del(`email-old-${req.user.id}`);
  codes.set(`email-old-ok-${req.user.id}`, { verified: true });
  res.json({ message: 'Identidade confirmada' });
});

// POST /api/profile/send-email-new-code
router.post('/send-email-new-code', requireAuth, async (req, res) => {
  if (!codes.get(`email-old-ok-${req.user.id}`))
    return res.status(403).json({ error: 'Identidade não verificada. Reinicie o processo.' });

  const novoEmail = req.body?.novoEmail?.trim();
  if (!novoEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail))
    return res.status(400).json({ error: 'Email inválido' });

  const { data: existing } = await supabase
    .from('users').select('id').eq('email', novoEmail).neq('id', req.user.id).limit(1);
  if (existing?.length) return res.status(400).json({ error: 'Email já cadastrado' });

  const code = codes.generate();
  codes.set(`email-new-${req.user.id}`, { code, novoEmail });

  try {
    await sendEmailNewCode(novoEmail, code);
    res.json({ message: 'Código enviado para o novo email' });
  } catch (e) {
    console.error('SMTP error:', e.message);
    res.status(500).json({ error: 'Erro ao enviar email para o novo endereço.' });
  }
});

// POST /api/profile/change-email
router.post('/change-email', requireAuth, async (req, res) => {
  const { code } = req.body;
  const entry = codes.get(`email-new-${req.user.id}`);
  if (!entry || entry.code !== code) return res.status(400).json({ error: 'Código inválido ou expirado' });

  codes.del(`email-new-${req.user.id}`);
  codes.del(`email-old-ok-${req.user.id}`);

  const { error } = await supabase.from('users').update({ email: entry.novoEmail }).eq('id', req.user.id);
  if (error) return res.status(500).json({ error: 'Erro ao atualizar email' });

  logAudit({ usuarioId: req.user.id, acao: 'EMAIL_CHANGED', detalhes: { novoEmail: entry.novoEmail }, ip: getIp(req) }).catch(() => {});
  res.json({ message: 'Email alterado com sucesso', novoEmail: entry.novoEmail });
});

// DELETE /api/profile — exclusão da própria conta
router.delete('/', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    await supabase.from('escala_dias').delete().eq('usuario_id', userId);

    const { data: filesToDelete } = await supabase
      .from('files').select('id, caminho').eq('usuario_id', userId).in('status', ['PENDING', 'REJECTED']);

    if (filesToDelete?.length) {
      const paths = filesToDelete.map(f => f.caminho).filter(Boolean);
      if (paths.length) await supabase.storage.from('files').remove(paths);
      await supabase.from('files').delete().in('id', filesToDelete.map(f => f.id));
    }

    await supabase.from('files').update({ usuario_id: null }).eq('usuario_id', userId).eq('status', 'APPROVED');

    const { data: foto } = await supabase.from('users').select('foto_perfil').eq('id', userId).single();
    if (foto?.foto_perfil) await supabase.storage.from('avatars').remove([foto.foto_perfil]);

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) return res.status(500).json({ error: 'Erro ao excluir conta' });

    logAudit({ usuarioId: userId, acao: 'ACCOUNT_DELETED_SELF', ip: getIp(req) }).catch(() => {});
    res.json({ message: 'Conta excluída com sucesso' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

module.exports = router;
