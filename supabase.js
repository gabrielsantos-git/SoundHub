const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://hmxnqxozyldroulhnqha.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vhsQfqCNoHlhoCzYKiSIUg_ckHhlThL';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
