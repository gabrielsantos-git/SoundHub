const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados');
}

const clientOptions = { auth: { persistSession: false } };

// Node.js < 22 não tem WebSocket nativo; fornecer o pacote ws
if (typeof WebSocket === 'undefined') {
  clientOptions.realtime = { transport: require('ws') };
}

const supabase = createClient(supabaseUrl, supabaseKey, clientOptions);

module.exports = supabase;
