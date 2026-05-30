const crypto = require('crypto');

const qrCodes = new Map();

function getExpiryMs() {
  const raw = process.env.QR_EXPIRY_TIME;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 60 * 60 * 1000;
}

function createQr({ protocol, host, createdBy }) {
  const token = crypto.randomBytes(32).toString('hex');
  const uploadUrl = `${protocol}://${host}/upload.html?token=${token}`;
  const now = Date.now();
  const expiresAt = now + getExpiryMs();

  qrCodes.set(token, {
    token,
    uploadUrl,
    createdAt: now,
    expiresAt,
    createdBy,
    used: false,
    locked: false
  });

  return { token, uploadUrl };
}

function getOrCleanup(token) {
  const data = qrCodes.get(token);
  if (!data) return null;

  if (Date.now() > data.expiresAt) {
    qrCodes.delete(token);
    return null;
  }

  return data;
}

function verify(token) {
  const data = getOrCleanup(token);
  if (!data) return { valid: false, reason: 'QR code não encontrado ou expirou' };
  if (data.used) return { valid: false, reason: 'QR code já foi utilizado' };
  if (data.locked) return { valid: false, reason: 'QR code em uso' };
  return { valid: true, data };
}

function lock(token) {
  const result = verify(token);
  if (!result.valid) return result;

  result.data.locked = true;
  result.data.lockedAt = Date.now();
  return { valid: true, data: result.data };
}

function unlock(token) {
  const data = qrCodes.get(token);
  if (!data) return false;
  data.locked = false;
  delete data.lockedAt;
  return true;
}

function markUsed(token) {
  const data = getOrCleanup(token);
  if (!data) return { success: false, error: 'QR code não encontrado ou expirou' };
  if (data.used) return { success: false, error: 'QR code já foi utilizado' };
  data.used = true;
  data.usedAt = Date.now();
  data.locked = false;
  delete data.lockedAt;
  return { success: true, data };
}

function status(token, { userId } = {}) {
  const data = getOrCleanup(token);
  if (!data) {
    return {
      token,
      valid: false,
      used: true,
      createdAt: null,
      reason: 'QR code não encontrado ou expirou'
    };
  }

  if (userId && data.createdBy && data.createdBy !== userId) {
    return {
      token,
      valid: false,
      used: true,
      createdAt: null,
      reason: 'QR code não encontrado ou expirou'
    };
  }

  return {
    token,
    valid: !data.used,
    used: data.used,
    createdAt: data.createdAt
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of qrCodes.entries()) {
    if (now > data.expiresAt || data.used) {
      qrCodes.delete(token);
    }
  }
}, 30000);

module.exports = {
  createQr,
  verify,
  lock,
  unlock,
  markUsed,
  status
};
