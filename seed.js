const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

async function createAdmin() {
  const senhaPlana = '@dmin123';
  const hashedPassword = await bcrypt.hash(senhaPlana, 10);

  const admin = {
    nome: 'Administrador SoundHub',
    email: 'admin@soundhub.com',
    senha: hashedPassword,
    cargo: 'ADMIN',
    status: 'APPROVED', // Garante que já nasça aprovado
    data_cadastro: new Date().toISOString()
  };

  try {
    console.log('🔧 Criando usuário admin...');
    console.log('Senha (texto puro):', senhaPlana);
    console.log('Hash gerado:', hashedPassword);
    
    const { data, error } = await supabase
      .from('users')
      .insert(admin)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar admin:', error);
      return;
    }

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📋 Dados:');
    console.log('   ID:', data.id);
    console.log('   Nome:', data.nome);
    console.log('   Email:', data.email);
    console.log('   Cargo:', data.cargo);
    console.log('   Status:', data.status);
    console.log('   Senha (texto puro):', senhaPlana);
    
    console.log('\n🌐 URL de login:');
    console.log('   https://soundhub-dun.vercel.app/auth');
    
  } catch (err) {
    console.error('❌ Erro no script:', err);
  }
}

createAdmin();
