const supabase = require('../supabase');

function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'desconhecido';
}

async function logAudit({ usuarioId = null, acao, recurso = null, recursoId = null, detalhes = null, ip = null }) {
  try {
    await supabase.from('audit_logs').insert({
      usuario_id: usuarioId || null,
      acao,
      recurso: recurso || null,
      recurso_id: recursoId != null ? String(recursoId) : null,
      detalhes: detalhes || null,
      ip: ip || null
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

module.exports = { logAudit, getIp };
