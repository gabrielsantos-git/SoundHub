const store = new Map();

function generate() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function set(key, payload, ttlMs = 10 * 60 * 1000) {
  const prev = store.get(key);
  if (prev?._timer) clearTimeout(prev._timer);
  const timer = setTimeout(() => store.delete(key), ttlMs);
  store.set(key, { ...payload, _expires: Date.now() + ttlMs, _timer: timer });
}

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry._expires) { store.delete(key); return null; }
  return entry;
}

function del(key) {
  const entry = store.get(key);
  if (entry?._timer) clearTimeout(entry._timer);
  store.delete(key);
}

module.exports = { generate, set, get, del };
