const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'soundhub_secret_key';

// Middleware de autenticação
function checkAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar usuário no banco
        db.get(
            "SELECT * FROM users WHERE id = ? AND status = 'APPROVED'",
            [decoded.id],
            (err, user) => {
                if (err || !user) {
                    return res.status(401).json({ error: 'Token inválido' });
                }
                req.user = user;
                next();
            }
        );
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// Middleware para verificar permissões de admin/diretor
function checkAdmin(req, res, next) {
    if (req.user.cargo !== 'ADMIN' && req.user.cargo !== 'DIRETOR') {
        return res.status(403).json({ error: 'Permissão negada' });
    }
    next();
}

// Listar eventos
router.get('/', checkAuth, (req, res) => {
    const query = req.user.cargo === 'ADMIN' || req.user.cargo === 'DIRETOR' 
        ? "SELECT e.*, u.nome as criado_por_nome FROM eventos e LEFT JOIN users u ON e.criado_por = u.id ORDER BY e.data_inicio DESC"
        : "SELECT e.*, u.nome as criado_por_nome FROM eventos e LEFT JOIN users u ON e.criado_por = u.id ORDER BY e.data_inicio DESC";
    
    db.all(query, (err, events) => {
        if (err) {
            console.error('Erro ao listar eventos:', err);
            return res.status(500).json({ error: 'Erro ao listar eventos' });
        }
        
        res.json(events);
    });
});

// Obter evento específico
router.get('/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    
    db.get(
        "SELECT e.*, u.nome as criado_por_nome FROM eventos e LEFT JOIN users u ON e.criado_por = u.id WHERE e.id = ?",
        [id],
        (err, event) => {
            if (err) {
                console.error('Erro ao obter evento:', err);
                return res.status(500).json({ error: 'Erro ao obter evento' });
            }
            
            if (!event) {
                return res.status(404).json({ error: 'Evento não encontrado' });
            }
            
            // Obter dias do evento
            db.all(
                "SELECT ed.*, u.nome as usuario_nome FROM escala_dias ed LEFT JOIN users u ON ed.usuario_id = u.id WHERE ed.escala_id = ? ORDER BY ed.data_especifica",
                [id],
                (err, days) => {
                    if (err) {
                        console.error('Erro ao obter dias do evento:', err);
                        return res.status(500).json({ error: 'Erro ao obter dias do evento' });
                    }
                    
                    event.dias = days;
                    res.json(event);
                }
            );
        }
    );
});

// Obter dias de um evento
router.get('/:id/days', checkAuth, (req, res) => {
    const { id } = req.params;
    
    db.all(
        "SELECT ed.*, u.nome as usuario_nome FROM escala_dias ed LEFT JOIN users u ON ed.usuario_id = u.id WHERE ed.escala_id = ? ORDER BY ed.data_especifica",
        [id],
        (err, days) => {
            if (err) {
                console.error('Erro ao obter dias do evento:', err);
                return res.status(500).json({ error: 'Erro ao obter dias do evento' });
            }
            
            res.json(days);
        }
    );
});

// Criar novo evento
router.post('/', checkAuth, checkAdmin, (req, res) => {
    const { nome, descricao, data_inicio, data_fim } = req.body;
    
    if (!nome || !data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Nome, data de início e data de término são obrigatórios' });
    }
    
    // Validar datas
    const startDate = new Date(data_inicio);
    const endDate = new Date(data_fim);
    
    if (startDate > endDate) {
        return res.status(400).json({ error: 'Data de início deve ser anterior à data de término' });
    }
    
    // Inserir evento
    db.run(
        "INSERT INTO eventos (nome, descricao, data_inicio, data_fim, criado_por) VALUES (?, ?, ?, ?, ?)",
        [nome, descricao || '', data_inicio, data_fim, req.user.id],
        function(err) {
            if (err) {
                console.error('Erro ao criar evento:', err);
                return res.status(500).json({ error: 'Erro ao criar evento' });
            }
            
            const eventoId = this.lastID;
            
            // Obter usuários disponíveis para distribuição
            db.all(
                "SELECT id, nome FROM users WHERE status = 'APPROVED' AND cargo IN ('SONOPLASTA', 'DIRETOR', 'ADMIN')",
                (err, users) => {
                    if (err) {
                        console.error('Erro ao obter usuários:', err);
                        return res.status(500).json({ error: 'Erro ao obter usuários' });
                    }
                    
                    if (users.length === 0) {
                        return res.status(400).json({ error: 'Nenhum usuário disponível para evento' });
                    }
                    
                    // Gerar datas para o evento
                    const eventDays = generateEventDays(startDate, endDate, users);
                    
                    // Inserir dias do evento
                    const insertPromises = eventDays.map(day => {
                        return new Promise((resolve, reject) => {
                            db.run(
                                "INSERT INTO escala_dias (escala_id, dia_semana, data_especifica, usuario_id) VALUES (?, ?, ?, ?)",
                                [eventoId, day.dia_semana, day.data_especifica, day.usuario_id],
                                function(err) {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                    });
                    
                    Promise.all(insertPromises)
                        .then(() => {
                            res.json({
                                message: 'Evento criado com sucesso',
                                evento_id: eventoId
                            });
                        })
                        .catch(err => {
                            console.error('Erro ao inserir dias do evento:', err);
                            res.status(500).json({ error: 'Erro ao criar dias do evento' });
                        });
                }
            );
        }
    );
});

// Atualizar dias de um evento
router.put('/:id/days', checkAuth, checkAdmin, (req, res) => {
    const { id } = req.params;
    const { days } = req.body;
    
    if (!days || !Array.isArray(days)) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    
    // Atualizar cada dia
    const updatePromises = days.map(day => {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE escala_dias SET usuario_id = ? WHERE id = ? AND escala_id = ?",
                [day.usuario_id, day.id, id],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });
    
    Promise.all(updatePromises)
        .then(() => {
            res.json({ message: 'Evento atualizado com sucesso' });
        })
        .catch(err => {
            console.error('Erro ao atualizar evento:', err);
            res.status(500).json({ error: 'Erro ao atualizar evento' });
        });
});

// Deletar evento
router.delete('/:id', checkAuth, checkAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(
        "DELETE FROM eventos WHERE id = ?",
        [id],
        function(err) {
            if (err) {
                console.error('Erro ao deletar evento:', err);
                return res.status(500).json({ error: 'Erro ao deletar evento' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Evento não encontrado' });
            }
            
            res.json({ message: 'Evento deletado com sucesso' });
        }
    );
});

// Função para gerar dias do evento
function generateEventDays(startDate, endDate, users) {
    const result = [];
    const currentDate = new Date(startDate);
    let userIndex = 0;
    
    while (currentDate <= endDate) {
        const dayOfWeek = getDayOfWeek(currentDate.getDay());
        const assignedUser = users[userIndex % users.length];
        
        result.push({
            dia_semana: dayOfWeek,
            data_especifica: currentDate.toISOString().split('T')[0],
            usuario_id: assignedUser.id,
            usuario_nome: assignedUser.nome
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
        userIndex++;
    }
    
    return result;
}

// Função para obter dia da semana em português
function getDayOfWeek(dayNumber) {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return days[dayNumber];
}

module.exports = router;
