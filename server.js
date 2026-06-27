const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Inicializar Supabase
const { initializeDatabase } = require('./database-supabase');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const qrRoutes = require('./routes/qr');
const userRoutes = require('./routes/users');
const scheduleRoutes = require('./routes/schedules');
const eventRoutes = require('./routes/events');
const cleanupRoutes = require('./routes/cleanup');
const profileRoutes = require('./routes/profile');

const app = express();
const isVercel = !!process.env.VERCEL;

// Configurações robustas para evitar conexões recusadas
app.use((req, res, next) => {
  res.header('Connection', 'keep-alive');
  res.header('Keep-Alive', 'timeout=5');
  next();
});

let server;
let io;

if (!isVercel) {
  server = http.createServer(app);
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
}

const NODE_ENV = process.env.NODE_ENV || 'production';

// Configurações de ambiente
const isProduction = NODE_ENV === 'production';

console.log(`Ambiente: ${NODE_ENV}`);

// Em produção, verificar arquivos essenciais
if (!isProduction) {
  const requiredFiles = ['index.html', 'auth.html', 'project.html', 'receive.html', 'accounts.html', 'display.html'];
  const missingFiles = [];

  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.error('ERRO: Arquivos HTML essenciais não encontrados:', missingFiles);
    console.error('Por favor, verifique se todos os arquivos existem no diretório.');
  } else {
    console.log('Todos os arquivos HTML essenciais encontrados.');
  }
}

// Inicializar banco de dados
initializeDatabase().catch(error => {
  console.error('❌ Erro ao inicializar banco de dados:', error);
});

// Headers de segurança HTTP (anti-clickjacking, MIME sniff, XSS, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // desativado: o app usa inline scripts nas páginas HTML
  crossOriginEmbedderPolicy: false // desativado: permite carregar recursos externos (Supabase storage)
}));

app.set('trust proxy', 1);
const allowedOrigin = process.env.FRONTEND_URL || null;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limit global para todas as rotas /api (proteção DoS)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' }
});
app.use('/api/', apiLimiter);

// Serve os arquivos da pasta raiz (onde estão os HTMLs e JS)
app.use(express.static(path.join(__dirname)));

// Serve a pasta de uploads para que as imagens apareçam
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/profile', profileRoutes);

// Serve arquivos estáticos (HTML, JS, CSS, imagens)
app.get('/receive', (req, res) => {
  res.sendFile(path.join(__dirname, 'receive.html'));
});

// Serve favicon e arquivos estáticos
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
});

// Serve apenas arquivos JS de frontend (whitelist explícita)
const PUBLIC_JS = new Set(['sidebar.js', 'navigation.js', 'project.js']);
app.get('/:filename.js', (req, res) => {
  const filename = req.params.filename + '.js';
  if (!PUBLIC_JS.has(filename)) return res.status(404).end();
  res.sendFile(path.join(__dirname, filename));
});

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Servir páginas HTML estáticas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/privacidade', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacidade.html'));
});


app.get('/project', (req, res) => {
  res.sendFile(path.join(__dirname, 'project.html'));
});

app.get('/accounts', (req, res) => {
  res.sendFile(path.join(__dirname, 'accounts.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'display.html'));
});

app.get('/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'control.html'));
});

app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

app.get('/schedule', (req, res) => {
  res.sendFile(path.join(__dirname, 'schedule.html'));
});

app.get('/projection', (req, res) => {
  res.sendFile(path.join(__dirname, 'projection.html'));
});

// Rota de API para verificação de status (deve vir antes do middleware 404)
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'SoundHub funcionando',
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de 404 para rotas HTML
app.use((req, res, next) => {
  // Se for uma rota HTML que não existe, verificar se o arquivo existe
  if (req.path.startsWith('/') && !req.path.includes('.') && !req.path.startsWith('/api/')) {
    const possibleFiles = [
      path.join(__dirname, req.path.slice(1) + '.html'),
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'auth.html')
    ];
    
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        console.log(`Rota não encontrada, servindo fallback: ${req.path} -> ${file}`);
        return res.sendFile(file);
      }
    }
  }
  next();
});

// Middleware de 404 final
app.use((req, res) => {
  console.log(`404 - Rota não encontrada: ${req.method} ${req.path}`);
  
  // Se for uma requisição de página HTML, servir index.html como fallback
  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    console.log(`Servindo index.html como fallback para: ${req.path}`);
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  
  // Para API, retornar erro JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }
  
  // Para outros casos, retornar erro HTML
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Página Não Encontrada</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Página Não Encontrada</h1>
      <p>A página que você está procurando não existe.</p>
      <p><a href="/">Voltar para a página inicial</a></p>
    </body>
    </html>
  `);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/out')));
  app.get('*', (req, res) => {
    // Se for rota de API, retorna 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    // Se não, serve o index.html (para rotas do frontend)
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

if (!isVercel) {
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('join-display', (screenId) => {
      socket.join(`display-${screenId}`);
      console.log(`Display ${screenId} joined`);
    });

    socket.on('project-file', (data) => {
      const { screenId, file } = data;
      io.to(`display-${screenId}`).emit('display-file', file);
      console.log(`Projetando arquivo ${file.name} na tela ${screenId}`);
    });

    socket.on('stop-projection', (screenId) => {
      io.to(`display-${screenId}`).emit('stop-display');
      console.log(`Parando projeção na tela ${screenId}`);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });

  server.on('connection', (socket) => {
    console.log('Nova conexão TCP estabelecida');

    socket.on('close', (hadError) => {
      console.log(`Conexão TCP fechada. Erro: ${hadError}`);
    });

    socket.on('error', (err) => {
      console.error('Erro na conexão TCP:', err.message);
    });
  });

  server.on('error', (err) => {
    console.error('Erro no servidor:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Porta já está em uso!`);
    }
  });
}

// Export para Vercel Serverless Function
module.exports = app;
