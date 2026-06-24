const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { reajustarEscalasParaNovoUsuario } = require('./schedules');
const router = express.Router();

// Listar todos os usuários (aprovados)
router.get('/', requireAuth, async (req, res) => {
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
router.get('/pending', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
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
router.get('/:id', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, cargo, status, data_cadastro')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

// Atualizar usuário
router.put('/:id', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { nome, email, senha, cargo } = req.body;
    
    if (!nome || !email || !cargo) {
      return res.status(400).json({ error: 'Nome, email e cargo são obrigatórios' });
    }
    
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .limit(1);

    if (existingError) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const updatePayload = { nome, email, cargo };

    if (senha && String(senha).trim() !== '') {
      updatePayload.senha = await bcrypt.hash(senha, 10);
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, nome, email, cargo, status, data_cadastro')
      .single();

    if (updateError || !updatedUser) {
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Alterar cargo do usuário
router.patch('/:id/cargo', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { cargo } = req.body;
    
    if (!cargo) {
      return res.status(400).json({ error: 'Cargo é obrigatório' });
    }
    
    const validCargos = ['SONOPLASTA', 'DIRETOR', 'ADMIN'];
    if (!validCargos.includes(cargo)) {
      return res.status(400).json({ error: 'Cargo inválido' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ cargo })
      .eq('id', userId)
      .select('id')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Cargo atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cargo' });
  }
});

// Aprovar usuário
router.patch('/:id/approve', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const { data, error } = await supabase
      .from('users')
      .update({ status: 'APPROVED', aprovado_em: new Date().toISOString() })
      .eq('id', userId)
      .select('id, cargo')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Reajustar escalas ativas para incluir o novo SONOPLASTA ou DIRETOR
    if (data.cargo === 'SONOPLASTA' || data.cargo === 'DIRETOR') {
      reajustarEscalasParaNovoUsuario(userId).catch(() => {});
    }

    res.json({ message: 'Usuário aprovado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
});

// Rejeitar usuário
router.patch('/:id/reject', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const { data, error } = await supabase
      .from('users')
      .update({ status: 'REJECTED', rejeitado_em: new Date().toISOString() })
      .eq('id', userId)
      .select('id')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário rejeitado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar usuário' });
  }
});

// Excluir usuário
router.delete('/:id', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const { data: existing } = await supabase.from('users').select('id').eq('id', userId).single();
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover das escalas
    await supabase.from('escala_dias').delete().eq('usuario_id', userId);

    // Transferir escalas e eventos criados para o admin executor
    await supabase.from('escalas').update({ criado_por: req.user.id }).eq('criado_por', userId);
    await supabase.from('eventos').update({ criado_por: req.user.id }).eq('criado_por', userId);

    // Buscar arquivos PENDING e REJECTED do usuário para deletar
    const { data: filesToDelete } = await supabase
      .from('files')
      .select('id, caminho')
      .eq('usuario_id', userId)
      .in('status', ['PENDING', 'REJECTED']);

    if (filesToDelete && filesToDelete.length > 0) {
      // Remover do Supabase Storage
      const paths = filesToDelete.map(f => f.caminho).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('files').remove(paths);
      }
      // Remover do banco
      const ids = filesToDelete.map(f => f.id);
      await supabase.from('files').delete().in('id', ids);
    }

    // Arquivos APPROVED permanecem no sistema — apenas desvincula o usuario_id
    await supabase
      .from('files')
      .update({ usuario_id: null })
      .eq('usuario_id', userId)
      .eq('status', 'APPROVED');

    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      return res.status(500).json({ error: 'Erro ao excluir usuário' });
    }

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Atualizar perfil do usuário logado
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const userId = req.user.id; // ID do usuário logado

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .limit(1);

    if (existingError) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const updatePayload = { nome, email };

    if (senha && String(senha).trim() !== '') {
      updatePayload.senha = await bcrypt.hash(senha, 10);
    }

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, nome, email, cargo, status, data_cadastro')
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
