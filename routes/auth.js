const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'soundhub-secret-key';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco de dados
    db.get(
      "SELECT * FROM users WHERE email = ? AND status = 'APPROVED'",
      [email],
      async (err, user) => {
        if (err) {
          console.error('Erro ao buscar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

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
      }
    );

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
    
    // Buscar usuário no banco de dados
    db.get(
      "SELECT id, nome, email, cargo FROM users WHERE id = ? AND status = 'APPROVED'",
      [decoded.id],
      (err, user) => {
        if (err) {
          console.error('Erro ao buscar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
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
      }
    );

  } catch (error) {
    console.error('Erro ao verificar token:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar usuário
router.post('/register', async (req, res) => {
  console.log("Dados recebidos no registro:", req.body); // ADICIONE ISSO
  
  try {
    const { nome, email, senha } = req.body;

    console.log("Dados extraídos:", { nome, email, senha: senha ? '***' : undefined });

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    db.get(
      "SELECT id FROM users WHERE email = ?",
      [email],
      async (err, existingUser) => {
        if (err) {
          console.error('Erro ao verificar email existente:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        if (existingUser) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Inserir novo usuário (aguardando aprovação)
        db.run(
          "INSERT INTO users (nome, email, senha, cargo, status, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)",
          [nome, email, hashedPassword, 'USUARIO', 'PENDING', new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Erro ao cadastrar usuário:', err);
              return res.status(500).json({ error: 'Erro interno do servidor' });
            }

            res.json({
              message: 'Cadastro realizado com sucesso! Aguarde aprovação para acessar.',
              status: 'PENDING'
            });
          }
        );
      }
    );

  } catch (error) {
    // Isso vai imprimir o erro exato no seu terminal (ex: "User.findByEmail is not a function")
    console.error('--- ERRO CRÍTICO NO REGISTRO ---');
    console.error(error); 
    
    res.status(500).json({ 
        message: 'Erro interno do servidor.',
        detalhe: error.message 
    });
  }
});

module.exports = router;
