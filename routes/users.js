const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const router = express.Router();

// Middleware para verificar autenticação e permissões
const checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  // Simulação de verificação de token - em produção usar JWT real
  // Por enquanto, vamos permitir que o frontend autentique
  next();
};

// Listar todos os usuários (aprovados)
router.get('/', checkAuth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, nome, email, cargo, status, data_cadastro')
      .eq('status', 'APPROVED')
      .order('data_cadastro', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
    
    res.json(users || []);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Listar usuários pendentes
router.get('/pending', checkAuth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, nome, email, cargo, status, data_cadastro')
      .eq('status', 'PENDING')
      .order('data_cadastro', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar usuários pendentes:', error);
      return res.status(500).json({ error: 'Erro ao listar usuários pendentes' });
    }
    
    res.json(users || []);
  } catch (error) {
    console.error('Erro ao listar usuários pendentes:', error);
    res.status(500).json({ error: 'Erro ao listar usuários pendentes' });
  }
});

// Obter usuário por ID
router.get('/:id', checkAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    db.get(
      "SELECT id, nome, email, cargo, status, data_cadastro FROM users WHERE id = ?",
      [userId],
      (err, user) => {
        if (err) {
          console.error('Erro ao obter usuário:', err);
          return res.status(500).json({ error: 'Erro ao obter usuário' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json(user);
      }
    );
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

// Atualizar usuário
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { nome, email, senha, cargo } = req.body;
    
    if (!nome || !email || !cargo) {
      return res.status(400).json({ error: 'Nome, email e cargo são obrigatórios' });
    }
    
    // Verificar se email já existe (exceto para o próprio usuário)
    db.get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, userId],
      async (err, existingUser) => {
        if (err) {
          console.error('Erro ao verificar email:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (existingUser) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        // Construir query dinamicamente
        let query = "UPDATE users SET nome = ?, email = ?, cargo = ?";
        let params = [nome, email, cargo];
        
        // Adicionar senha se fornecida
        if (senha && senha.trim() !== '') {
          const hashedPassword = await bcrypt.hash(senha, 10);
          query += ", senha = ?";
          params.push(hashedPassword);
        }
        
        query += " WHERE id = ?";
        params.push(userId);
        
        db.run(query, params, function(err) {
          if (err) {
            console.error('Erro ao atualizar usuário:', err);
            return res.status(500).json({ error: 'Erro ao atualizar usuário' });
          }
          
          // Retornar usuário atualizado
          db.get(
            "SELECT id, nome, email, cargo, status, data_cadastro FROM users WHERE id = ?",
            [userId],
            (err, updatedUser) => {
              if (err) {
                console.error('Erro ao obter usuário atualizado:', err);
                return res.status(500).json({ error: 'Erro ao atualizar usuário' });
              }
              
              res.json({
                message: 'Usuário atualizado com sucesso',
                user: updatedUser
              });
            }
          );
        });
      }
    );
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Alterar cargo do usuário
router.patch('/:id/cargo', checkAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { cargo } = req.body;
    
    if (!cargo) {
      return res.status(400).json({ error: 'Cargo é obrigatório' });
    }
    
    const validCargos = ['USUARIO', 'DIRETOR', 'ADMIN'];
    if (!validCargos.includes(cargo)) {
      return res.status(400).json({ error: 'Cargo inválido' });
    }
    
    db.run(
      "UPDATE users SET cargo = ? WHERE id = ?",
      [cargo, userId],
      function(err) {
        if (err) {
          console.error('Erro ao atualizar cargo:', err);
          return res.status(500).json({ error: 'Erro ao atualizar cargo' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ message: 'Cargo atualizado com sucesso' });
      }
    );
  } catch (error) {
    console.error('Erro ao atualizar cargo:', error);
    res.status(500).json({ error: 'Erro ao atualizar cargo' });
  }
});

// Aprovar usuário
router.patch('/:id/approve', checkAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    db.run(
      "UPDATE users SET status = 'APPROVED', aprovado_em = CURRENT_TIMESTAMP WHERE id = ?",
      [userId],
      function(err) {
        if (err) {
          console.error('Erro ao aprovar usuário:', err);
          return res.status(500).json({ error: 'Erro ao aprovar usuário' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ message: 'Usuário aprovado com sucesso' });
      }
    );
  } catch (error) {
    console.error('Erro ao aprovar usuário:', error);
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
});

// Rejeitar usuário
router.patch('/:id/reject', checkAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    db.run(
      "UPDATE users SET status = 'REJECTED', rejeitado_em = CURRENT_TIMESTAMP WHERE id = ?",
      [userId],
      function(err) {
        if (err) {
          console.error('Erro ao rejeitar usuário:', err);
          return res.status(500).json({ error: 'Erro ao rejeitar usuário' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ message: 'Usuário rejeitado com sucesso' });
      }
    );
  } catch (error) {
    console.error('Erro ao rejeitar usuário:', error);
    res.status(500).json({ error: 'Erro ao rejeitar usuário' });
  }
});

// Excluir usuário
router.delete('/:id', checkAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    db.run(
      "DELETE FROM users WHERE id = ?",
      [userId],
      function(err) {
        if (err) {
          console.error('Erro ao excluir usuário:', err);
          return res.status(500).json({ error: 'Erro ao excluir usuário' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ message: 'Usuário excluído com sucesso' });
      }
    );
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Atualizar perfil do usuário logado
router.put('/profile', checkAuth, (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const userId = req.user.id; // ID do usuário logado

    console.log('🔍 Atualizando perfil do usuário:', userId);
    console.log('Dados recebidos:', { nome, email, senha: senha ? '***' : undefined });

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Construir query dinamicamente
    let updateFields = ['nome = ?', 'email = ?'];
    let updateValues = [nome, email];

    // Adicionar senha se fornecida
    if (senha) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(senha, 10);
      updateFields.push('senha = ?');
      updateValues.push(hashedPassword);
    }

    updateValues.push(userId); // Adicionar ID para WHERE

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(updateQuery, updateValues, function(err) {
      if (err) {
        console.error('Erro ao atualizar perfil:', err);
        return res.status(500).json({ error: 'Erro ao atualizar perfil' });
      }

      // Buscar usuário atualizado para retornar
      db.get(
        "SELECT id, nome, email, cargo, status, data_cadastro FROM users WHERE id = ?",
        [userId],
        (err, user) => {
          if (err) {
            console.error('Erro ao buscar usuário atualizado:', err);
            return res.status(500).json({ error: 'Erro ao buscar usuário atualizado' });
          }

          console.log('✅ Perfil atualizado com sucesso:', user);
          res.json({
            message: 'Perfil atualizado com sucesso',
            user: user
          });
        }
      );
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
