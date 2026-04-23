const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado.' });
    }

    const hashedPassword = bcrypt.hashSync(senha, 10);
    const user = await User.create({ nome, email, senha: hashedPassword });

    res.status(201).json({ 
      message: 'Usuário criado com sucesso. Aguarde aprovação.',
      user: { id: user.id, nome, email }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    if (user.status !== 'APPROVED') {
      return res.status(401).json({ message: 'Usuário não aprovado.' });
    }

    const isPasswordValid = bcrypt.compareSync(senha, user.senha);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, cargo: user.cargo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
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
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        cargo: req.user.cargo
      }
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

module.exports = router;
