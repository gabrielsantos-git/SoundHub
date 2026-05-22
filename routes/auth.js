const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'soundhub-secret-key';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('status', 'APPROVED')
      .single();

    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha (aceita hash e texto puro temporariamente)
    const validPassword = await bcrypt.compare(senha, user.senha);
    const isTextPassword = senha === user.senha;
    
    if (!validPassword && !isTextPassword) {
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
    
    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, cargo')
      .eq('id', decoded.id)
      .eq('status', 'APPROVED')
      .single();
    
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(401).json({ error: 'Usuário não encontrado' });
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
  console.log("Dados recebidos no registro:", req.body);
  
  try {
    const { nome, email, senha } = req.body;

    console.log("Dados extraídos:", { nome, email, senha: senha ? '***' : undefined });

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar email existente:', checkError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir novo usuário (aguardando aprovação)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        nome,
        email,
        senha: hashedPassword,
        cargo: 'USUARIO',
        status: 'PENDING',
        data_cadastro: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao cadastrar usuário:', insertError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({
      message: 'Cadastro realizado com sucesso! Aguarde aprovação para acessar.',
      status: 'PENDING'
    });

  } catch (error) {
    console.error('--- ERRO CRÍTICO NO REGISTRO ---');
    console.error(error); 
    
    res.status(500).json({ 
        message: 'Erro interno do servidor.',
        detalhe: error.message 
    });
  }
});

module.exports = router;
