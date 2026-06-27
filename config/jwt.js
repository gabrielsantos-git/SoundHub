function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error('JWT_SECRET não configurado');
  }

  return secret;
}

module.exports = { getJwtSecret };
