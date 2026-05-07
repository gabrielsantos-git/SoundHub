# SoundHub - Sistema de Mídia para Igrejas

Sistema completo para organização e projeção de mídia em igrejas, com upload via QR Code, aprovação de conteúdo e projeção em tempo real.

## 🚀 Funcionalidades

- **Upload via QR Code**: Usuários enviam arquivos escaneando um QR Code dinâmico
- **Aprovação de Conteúdo**: Sonoplasta aprova ou recusa arquivos enviados
- **Projeção em Tempo Real**: Projeção instantânea em múltiplas telas via WebSocket
- **Gestão de Usuários**: Sistema de cargos (Sonoplasta, Diretor) e permissões
- **Interface Moderna**: Design responsivo com TailwindCSS
- **Armazenamento Local**: Arquivos salvos localmente com opção de migração para cloud

## 📋 Requisitos

- Node.js 16.0.0 ou superior
- npm ou yarn
- Navegador moderno com suporte a WebSocket

## 🛠️ Instalação

### 1. Clonar o projeto
```bash
git clone <repositorio>
cd soundhub
```

### 2. Instalar dependências
```bash
# Instalar dependências do backend e frontend
npm run install:all
```

### 3. Configurar variáveis de ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env com suas configurações
NODE_ENV=development
PORT=3000
JWT_SECRET=sua_chave_secreta_aqui
DB_PATH=./database.sqlite
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50000000
```

### 4. Iniciar o servidor
```bash
# Modo desenvolvimento
npm run dev

# Ou modo produção
npm run build
npm start
```

### 5. Acessar o sistema
- **Backend/API**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **Usuário Admin**: admin@soundhub.com / admin123

## 📁 Estrutura do Projeto

```
soundhub/
├── server.js                 # Servidor principal Express + Socket.io
├── package.json              # Dependências do backend
├── .env.example              # Exemplo de variáveis de ambiente
├── models/                   # Modelos do banco de dados
│   ├── database.js          # Configuração do SQLite
│   ├── User.js              # Modelo de Usuário
│   ├── File.js              # Modelo de Arquivo
│   └── QRCode.js            # Modelo de QR Code
├── routes/                   # Rotas da API
│   ├── auth.js              # Autenticação
│   ├── files.js             # Upload e gerenciamento de arquivos
│   ├── qr.js                # Geração de QR Codes
│   └── users.js             # Gestão de usuários
├── middleware/               # Middlewares
│   └── auth.js              # Verificação de JWT
├── uploads/                  # Pasta de uploads (criada automaticamente)
├── client/                   # Frontend Next.js
│   ├── package.json         # Dependências do frontend
│   ├── next.config.js       # Configuração do Next.js
│   ├── tailwind.config.js   # Configuração do TailwindCSS
│   └── src/
│       ├── app/             # Páginas do App Router
│       │   ├── globals.css  # Estilos globais
│       │   ├── layout.tsx   # Layout principal
│       │   ├── login/       # Página de login
│       │   ├── home/        # Página inicial
│       │   ├── receive/     # Recebimento de arquivos
│       │   ├── upload/      # Upload via QR Code
│       │   ├── project/     # Projeção
│       │   ├── display/     # Tela de projeção
│       │   └── accounts/    # Gestão de contas
│       ├── components/      # Componentes reutilizáveis
│       │   └── Sidebar.tsx  # Barra lateral
│       └── lib/             # Utilitários
│           └── auth.ts      # Funções de autenticação
└── database.sqlite           # Banco de dados (criado automaticamente)
```

## 🔐 Usuários e Permissões

### Cargos
- **USER**: Usuário comum (pode acessar home e baixar arquivos)
- **SONOPLASTA**: Pode gerar QR Codes, aprovar/rejeitar arquivos e projetar
- **DIRETOR**: Todas as permissões + gerenciar usuários e excluir conteúdo

### Usuário Padrão
- **Email**: admin@soundhub.com
- **Senha**: admin123
- **Cargo**: DIRETOR

## 📱 Como Usar

### 1. Para Enviar Arquivos
1. Peça ao sonoplasta para gerar um QR Code em `/receive`
2. Escaneie o QR Code com seu celular
3. Preencha seu nome e selecione o arquivo
4. Aguarde aprovação

### 2. Para Aprovar Arquivos
1. Acesse `/receive` como Sonoplasta ou Diretor
2. Clique em "Gerar QR Code" para criar um novo token
3. Aguarde uploads na lista "Uploads Pendentes"
4. Aprove ou recuse os arquivos

### 3. Para Projetar
1. Acesse `/project` como Sonoplasta ou Diretor
2. Selecione um arquivo aprovado
3. Escolha a tela (Tela 1 ou Tela 2)
4. Clique "Abrir" para abrir a tela de projeção
5. Clique "Projetar" para iniciar

### 4. Para Gerenciar Usuários
1. Acesse `/accounts` como Diretor
2. Aprove novos usuários
3. Altere cargos conforme necessário
4. Exclua usuários inativos

## 🚀 Deploy em Produção

### Pré-requisitos
- Node.js 16.0.0 ou superior
- Servidor de hospedagem (VPS, DigitalOcean, AWS, Heroku, etc.)
- Acesso SSH ou painel de controle

### 1. Preparação para Deploy

#### Script Automático
```bash
# Executar script de preparação
npm run deploy:setup

# Ou manualmente:
node deploy.js
```

#### Manualmente
```bash
# 1. Instalar dependências de produção
npm install --production

# 2. Configurar ambiente
cp .env.production .env

# 3. Editar .env com suas configurações
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=sua_chave_secreta_muito_segura_aqui
DB_PATH=./database.sqlite
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100MB
QR_EXPIRY_TIME=3600000
```

### 2. Deploy em Diferentes Plataformas

#### Heroku
```bash
# Instalar Heroku CLI
# Login no Heroku
heroku login

# Criar app
heroku create soundhub-app

# Configurar variáveis
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=sua_chave_secreta
heroku config:set PORT=3000

# Deploy
git add .
git commit -m "Deploy para produção"
git push heroku main
```

#### VPS/DigitalOcean
```bash
# 1. Transferir arquivos
scp -r soundhub/ user@server:/var/www/

# 2. Instalar dependências
cd /var/www/soundhub
npm install --production

# 3. Configurar PM2 (process manager)
npm install -g pm2
pm2 start server.js --name "soundhub"
pm2 startup
pm2 save

# 4. Configurar Nginx (opcional)
sudo nano /etc/nginx/sites-available/soundhub
```

#### Hostinger
1. Acesse o painel Hostinger
2. Vá para "Hospedagem" → "Node.js"
3. Configure:
   - **Pasta do projeto**: `/public_html`
   - **Arquivo de inicialização**: `server.js`
   - **Versão do Node**: 18.x ou superior
4. Configure variáveis de ambiente no painel
5. Inicie a aplicação

### 3. Configuração de Produção

#### Variáveis de Ambiente Essenciais
```bash
NODE_ENV=production          # Ambiente de produção
PORT=3000                   # Porta do servidor
HOST=0.0.0.0               # Escutar em todas as interfaces
JWT_SECRET=chave_super_secreta  # Segredo para tokens JWT
DB_PATH=./database.sqlite   # Caminho do banco de dados
UPLOAD_DIR=./uploads        # Pasta de uploads
MAX_FILE_SIZE=100MB        # Tamanho máximo de arquivos
```

#### Segurança em Produção
```bash
# 1. Mudar JWT_SECRET para algo seguro
JWT_SECRET=$(openssl rand -base64 64)

# 2. Configurar HTTPS (recomendado)
# Use certificado Let's Encrypt ou similar

# 3. Configurar firewall
sudo ufw allow 3000
sudo ufw enable
```

### 4. Iniciar Servidor em Produção

#### Diretamente
```bash
NODE_ENV=production node server.js
```

#### Com PM2 (recomendado)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start server.js --name "soundhub" --env production

# Salvar configuração
pm2 save

# Configurar startup automático
pm2 startup
```

#### Com Systemd (Linux)
```bash
# Criar serviço
sudo nano /etc/systemd/system/soundhub.service

# Conteúdo do arquivo:
[Unit]
Description=SoundHub Media Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/soundhub
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target

# Habilitar e iniciar
sudo systemctl enable soundhub
sudo systemctl start soundhub
```

### 5. Monitoramento e Manutenção

#### Logs
```bash
# Com PM2
pm2 logs soundhub

# Com Systemd
sudo journalctl -u soundhub -f

# Arquivo de logs
tail -f /var/log/soundhub.log
```

#### Backup Automático
```bash
# Script de backup (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp database.sqlite backups/database_$DATE.sqlite
find backups/ -name "database_*.sqlite" -mtime +7 -delete

# Adicionar ao crontab
crontab -e
# Adicionar linha:
0 2 * * * /path/to/backup.sh
```

### 6. Troubleshooting de Produção

#### Problemas Comuns
- **Porta em uso**: Verifique se a porta está disponível
- **Permissões**: Configure permissões corretas para pastas
- **Memória**: Monitore uso de memória em produção
- **SSL**: Configure certificado SSL para HTTPS

#### Saúde da Aplicação
```bash
# Verificar se está rodando
curl http://localhost:3000/api/status

# Verificar processo
ps aux | grep node

# Verificar porta
netstat -tlnp | grep :3000
```

### Troubleshooting Hostinger

#### Erro Comum: "Cannot find module"
- Verifique se todas as dependências foram instaladas
- Execute `npm install` no servidor

#### Erro Comum: "Permission denied"
- Verifique as permissões das pastas `uploads` e `database.sqlite`
- Use chmod 755 nas pastas necessárias

#### Erro Comum: "Port already in use"
- Verifique se a porta configurada está disponível
- Use a porta fornecida pelo Hostinger

## 🔧 Manutenção

### Backup do Banco de Dados
```bash
# Fazer backup do SQLite
cp database.sqlite backup_$(date +%Y%m%d).sqlite
```

### Limpeza de Arquivos
```bash
# Limpar tokens expirados (via API)
curl -X POST http://seusite.com/api/qr/cleanup
```

### Logs
- Logs do servidor: Verifique no painel Hostinger
- Logs de erros: Verifique o console do navegador

## 🐛 Solução de Problemas

### Problemas Comuns

#### QR Code não funciona
- Verifique se o token não expirou (10 minutos)
- Confirme se o token não foi usado anteriormente
- Verifique a conexão com o servidor

#### Arquivo não projeta
- Confirme se o arquivo foi aprovado
- Verifique se a tela de projeção está aberta
- Teste a conexão WebSocket

#### Login não funciona
- Verifique se o usuário está aprovado
- Confirme se o email e senha estão corretos
- Limpe o cache do navegador

## 📞 Suporte

Para suporte técnico:
1. Verifique este README
2. Consulte os logs de erro
3. Entre em contato com o desenvolvedor

## 📄 Licença

MIT License - Ver arquivo LICENSE para detalhes

---

**Desenvolvido com ❤️ para igrejas**
