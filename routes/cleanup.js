const express = require('express');
const supabase = require('../supabase');
const router = express.Router();

// Períodos de retenção (em dias)
const RETENTION = {
  pendingUsers:   60,  // cadastros nunca aprovados
  rejectedUsers:  30,  // cadastros rejeitados
  pendingFiles:   30,  // arquivos aguardando aprovação
  rejectedFiles:  30,  // arquivos rejeitados
};

function cutoff(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function deleteFiles(records) {
  if (!records || records.length === 0) return 0;
  const paths = records.map(f => f.caminho).filter(Boolean);
  if (paths.length > 0) await supabase.storage.from('files').remove(paths);
  const ids = records.map(f => f.id);
  await supabase.from('files').delete().in('id', ids);
  return ids.length;
}

// GET /api/cleanup — chamado pelo Vercel Cron (ou manualmente com o secret)
router.get('/', async (req, res) => {
  // Vercel envia: Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
  }

  const summary = {
    executado_em: new Date().toISOString(),
    usuarios_pendentes_deletados: 0,
    usuarios_rejeitados_deletados: 0,
    arquivos_pendentes_deletados: 0,
    arquivos_rejeitados_deletados: 0,
    erros: []
  };

  // ── Usuários PENDING há mais de 60 dias ──
  try {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('status', 'PENDING')
      .lt('data_cadastro', cutoff(RETENTION.pendingUsers));

    if (data && data.length > 0) {
      const ids = data.map(u => u.id);
      await supabase.from('users').delete().in('id', ids);
      summary.usuarios_pendentes_deletados = ids.length;
    }
  } catch (e) {
    summary.erros.push('usuarios_pending: ' + e.message);
  }

  // ── Usuários REJECTED há mais de 30 dias ──
  try {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('status', 'REJECTED')
      .lt('rejeitado_em', cutoff(RETENTION.rejectedUsers));

    if (data && data.length > 0) {
      const ids = data.map(u => u.id);
      await supabase.from('users').delete().in('id', ids);
      summary.usuarios_rejeitados_deletados = ids.length;
    }
  } catch (e) {
    summary.erros.push('usuarios_rejected: ' + e.message);
  }

  // ── Arquivos PENDING há mais de 30 dias ──
  try {
    const { data } = await supabase
      .from('files')
      .select('id, caminho')
      .eq('status', 'PENDING')
      .lt('data_upload', cutoff(RETENTION.pendingFiles));

    summary.arquivos_pendentes_deletados = await deleteFiles(data);
  } catch (e) {
    summary.erros.push('arquivos_pending: ' + e.message);
  }

  // ── Arquivos REJECTED há mais de 30 dias ──
  try {
    const { data } = await supabase
      .from('files')
      .select('id, caminho')
      .eq('status', 'REJECTED')
      .lt('rejeitado_em', cutoff(RETENTION.rejectedFiles));

    summary.arquivos_rejeitados_deletados = await deleteFiles(data);
  } catch (e) {
    summary.erros.push('arquivos_rejected: ' + e.message);
  }

  console.log('Cleanup LGPD:', summary);
  res.json(summary);
});

module.exports = router;
