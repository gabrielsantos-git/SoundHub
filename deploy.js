// Script de Deploy para Produção
const fs = require('fs');
const path = require('path');

// Criar estrutura de pastas necessárias para deploy
const createDeployStructure = () => {
  const folders = [
    'uploads',
    'logs',
    'temp'
  ];

  folders.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Criada pasta: ${folder}`);
    }
  });
};

// Verificar arquivos essenciais
const verifyEssentialFiles = () => {
  const essentialFiles = [
    'server.js',
    'package.json',
    'database.js',
    '.env.production',
    'index.html',
    'auth.html',
    'project.html',
    'receive.html',
    'accounts.html',
    'upload.html',
    'display.html',
    'routes/auth.js',
    'routes/files.js',
    'routes/users.js',
    'routes/qr.js'
  ];

  const missingFiles = [];
  essentialFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.error('Arquivos essenciais faltando:', missingFiles);
    return false;
  }

  console.log('Todos os arquivos essenciais encontrados!');
  return true;
};

// Configurar variáveis de ambiente
const setupEnvironment = () => {
  const envPath = path.join(__dirname, '.env.production');
  
  if (!fs.existsSync(envPath)) {
    console.error('Arquivo .env.production não encontrado!');
    return false;
  }

  // Copiar .env.production para .env se não existir
  const targetEnvPath = path.join(__dirname, '.env');
  if (!fs.existsSync(targetEnvPath)) {
    fs.copyFileSync(envPath, targetEnvPath);
    console.log('Arquivo .env criado a partir de .env.production');
  }

  return true;
};

// Executar preparação para deploy
const prepareDeploy = () => {
  console.log('🚀 Preparando SoundHub para deploy...\n');

  createDeployStructure();
  
  if (!verifyEssentialFiles()) {
    console.error('❌ Deploy cancelado: Arquivos essenciais faltando');
    process.exit(1);
  }

  if (!setupEnvironment()) {
    console.error('❌ Deploy cancelado: Falha na configuração de ambiente');
    process.exit(1);
  }

  console.log('\n✅ Sistema pronto para deploy!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Configure as variáveis de ambiente no arquivo .env');
  console.log('2. Instale dependências: npm install --production');
  console.log('3. Inicie o servidor: NODE_ENV=production node server.js');
  console.log('4. Configure seu proxy/reverse proxy (nginx, apache, etc.)');
  console.log('5. Configure SSL/HTTPS para produção');
};

// Executar se chamado diretamente
if (require.main === module) {
  prepareDeploy();
}

module.exports = {
  createDeployStructure,
  verifyEssentialFiles,
  setupEnvironment,
  prepareDeploy
};
