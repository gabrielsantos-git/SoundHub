const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const { getJwtSecret } = require('../config/jwt');

async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, cargo, status')
      .eq('id', decoded.id)
      .eq('status', 'APPROVED')
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (!roles.includes(req.user.cargo)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    next();
  };
}

module.exports = { requireAuth, requireRoles };
