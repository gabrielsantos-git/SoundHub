const express = require('express');
const router = express.Router();

// Mock database - em produção usar banco de dados real
const users = [
  {
    id: 1,
    nome: 'Admin Sonoplasta',
    email: 'sonoplasta@soundhub.com',
    cargo: 'SONOPLASTA'
  },
  {
    id: 2,
    nome: 'Admin Diretor',
    email: 'diretor@soundhub.com',
    cargo: 'DIRETOR'
  }
];

// Listar usuários
router.get('/', (req, res) => {
  try {
    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Obter usuário por ID
router.get('/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

module.exports = router;
