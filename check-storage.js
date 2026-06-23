const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  console.error('SUPABASE_URL:', supabaseUrl ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('=== VERIFICANDO SUPABASE STORAGE ===');
  console.log('Supabase URL:', supabaseUrl);
  
  try {
    // Listar buckets
    console.log('\n📦 Listando buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError);
      return;
    }
    
    console.log('✅ Buckets encontrados:', buckets.length);
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (ID: ${bucket.id})`);
    });
    
    // Verificar se o bucket 'files' existe
    const filesBucket = buckets.find(b => b.name === 'files');
    
    if (!filesBucket) {
      console.log('\n❌ Bucket "files" não encontrado!');
      console.log('⚠️  Você precisa criar o bucket "files" no Supabase Storage');
      console.log('📝 Instruções:');
      console.log('   1. Acesse o Supabase Dashboard');
      console.log('   2. Vá em Storage');
      console.log('   3. Clique em "New bucket"');
      console.log('   4. Nome do bucket: files');
      console.log('   5. Configure as permissões (Public ou Private)');
    } else {
      console.log('\n✅ Bucket "files" encontrado!');
      
      // Tentar listar arquivos no bucket
      console.log('\n📁 Listando arquivos no bucket "files"...');
      const { data: files, error: filesError } = await supabase.storage.from('files').list('uploads', {
        limit: 10
      });
      
      if (filesError) {
        console.error('❌ Erro ao listar arquivos:', filesError);
      } else {
        console.log('✅ Arquivos encontrados:', files.length);
      }
    }
    
    // Verificar tabela 'files' no banco de dados
    console.log('\n🗄️  Verificando tabela "files" no banco de dados...');
    const { data: tableData, error: tableError } = await supabase
      .from('files')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Erro ao acessar tabela "files":', tableError);
      console.log('⚠️  A tabela "files" pode não existir no banco de dados');
    } else {
      console.log('✅ Tabela "files" encontrada!');
      console.log('📊 Total de arquivos:', tableData);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar storage:', error);
  }
}

checkStorage();
