const supabase = require('./supabase');
const bcrypt = require('bcryptjs');

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    console.log('Conectando ao Supabase...');
    console.log('URL:', process.env.SUPABASE_URL);
    
    // Verificar conexão
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
      console.error('Erro ao conectar ao Supabase:', error);
      return false;
    }
    
    console.log('Conexão com Supabase estabelecida com sucesso!');
    
    // Criar usuário admin automaticamente
    await createAdminUser();
    
    console.log('Banco de dados Supabase inicializado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    return false;
  }
}

// Função para criar usuário admin
async function createAdminUser() {
  try {
    // Verificar se usuário admin já existe
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@soundhub.com')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar usuário admin:', error);
      return;
    }
    
    if (user) {
      console.log('Usuário admin já existe!');
      console.log('Status atual:', user.status);
      
      // Atualizar status para APPROVED se não estiver
      if (user.status !== 'APPROVED') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ status: 'APPROVED' })
          .eq('email', 'admin@soundhub.com');
        
        if (updateError) {
          console.error('Erro ao atualizar status do admin:', updateError);
        } else {
          console.log('Status do admin atualizado para APPROVED!');
        }
      }
      return;
    }
    
    // Criar usuário admin
    console.log('Criando usuário admin@soundhub.com...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        nome: 'Administrador SoundHub',
        email: 'admin@soundhub.com',
        senha: hashedPassword,
        cargo: 'ADMIN',
        status: 'APPROVED',
        data_cadastro: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Erro ao criar usuário admin:', insertError);
    } else {
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('   Email: admin@soundhub.com');
      console.log('   Senha: admin123');
      console.log('   Status: APPROVED');
      console.log('   Cargo: ADMIN');
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
}

// Exportar funções
module.exports = {
  initializeDatabase,
  createAdminUser,
  supabase
};
