function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'soundhub-secret-key');

  if (!secret) {
    throw new Error('JWT_SECRET não configurado');
  }

  return secret;
}

module.exports = { getJwtSecret };
