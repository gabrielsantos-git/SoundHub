const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'soundhub-secret-key';

// Mock database - em produção usar banco de dados real
const users = [
  {
    id: 1,
    nome: 'Admin Sonoplasta',
    email: 'sonoplasta@soundhub.com',
    senha: '$2b$10$rQZ8kHWKtGYIuA5nY1o2UeY4Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5', // "senha123"
    cargo: 'SONOPLASTA'
  },
  {
    id: 2,
    nome: 'Admin Diretor',
    email: 'diretor@soundhub.com',
    senha: '$2b$10$rQZ8kHWKtGYIuA5nY1o2UeY4Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5', // "senha123"
    cargo: 'DIRETOR'
  }
];

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        cargo: user.cargo 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    console.error('Erro na verificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
