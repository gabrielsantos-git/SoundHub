function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    (process.env.NODE_ENV === 'production' ? '' : 'soundhub-secret-key');

  if (!secret) {
    throw new Error('JWT_SECRET ou SUPABASE_SECRET_KEY não configurado');
  }

  return secret;
}

module.exports = { getJwtSecret };
