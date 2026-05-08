const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://hmxnqxozyldroulhnqha.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vhsQfqCNoHlhoCzYKiSIUg_ckHhlThL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sua-chave-service-role-aqui';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Criar cliente Supabase com permissões de serviço (para operações admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase, supabaseAdmin };
