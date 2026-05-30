const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configurados');
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
