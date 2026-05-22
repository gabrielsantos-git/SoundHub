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

// Listar escalas semanais
router.get('/', checkAuth, (req, res) => {
    const query = req.user.cargo === 'ADMIN' || req.user.cargo === 'DIRETOR' 
        ? "SELECT e.*, u.nome as criado_por_nome FROM escalas e LEFT JOIN users u ON e.criado_por = u.id WHERE e.tipo = 'semanal' ORDER BY e.data_inicio DESC"
        : "SELECT e.*, u.nome as criado_por_nome FROM escalas e LEFT JOIN users u ON e.criado_por = u.id WHERE e.tipo = 'semanal' ORDER BY e.data_inicio DESC";
    
    db.all(query, (err, schedules) => {
        if (err) {
            console.error('Erro ao listar escalas:', err);
            return res.status(500).json({ error: 'Erro ao listar escalas' });
        }
        
        res.json(schedules);
    });
});

// Obter escala específica
router.get('/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    
    db.get(
        "SELECT e.*, u.nome as criado_por_nome FROM escalas e LEFT JOIN users u ON e.criado_por = u.id WHERE e.id = ?",
        [id],
        (err, schedule) => {
            if (err) {
                console.error('Erro ao obter escala:', err);
                return res.status(500).json({ error: 'Erro ao obter escala' });
            }
            
            if (!schedule) {
                return res.status(404).json({ error: 'Escala não encontrada' });
            }
            
            // Obter dias da escala
            db.all(
                "SELECT ed.*, u.nome as usuario_nome FROM escala_dias ed LEFT JOIN users u ON ed.usuario_id = u.id WHERE ed.escala_id = ? ORDER BY ed.dia_semana",
                [id],
                (err, days) => {
                    if (err) {
                        console.error('Erro ao obter dias da escala:', err);
                        return res.status(500).json({ error: 'Erro ao obter dias da escala' });
                    }
                    
                    schedule.dias = days;
                    res.json(schedule);
                }
            );
        }
    );
});

// Obter dias de uma escala
router.get('/:id/days', checkAuth, (req, res) => {
    const { id } = req.params;
    
    db.all(
        "SELECT ed.*, u.nome as usuario_nome FROM escala_dias ed LEFT JOIN users u ON ed.usuario_id = u.id WHERE ed.escala_id = ? ORDER BY ed.dia_semana",
        [id],
        (err, days) => {
            if (err) {
                console.error('Erro ao obter dias da escala:', err);
                return res.status(500).json({ error: 'Erro ao obter dias da escala' });
            }
            
            res.json(days);
        }
    );
});

// Criar nova escala mensal
router.post('/', checkAuth, checkAdmin, (req, res) => {
    const { dias } = req.body;
    
    if (!dias || !Array.isArray(dias) || dias.length === 0) {
        return res.status(400).json({ error: 'Selecione pelo menos um dia da semana' });
    }
    
    // Obter mês atual
    const dataAtual = new Date();
    const mes = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
    const ano = dataAtual.getFullYear();
    
    // Obter nome do mês
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const nomeMes = meses[dataAtual.getMonth()];
    
    // Inserir escala mensal
    db.run(
        "INSERT INTO escalas (nome, tipo, data_inicio, data_fim, criado_por) VALUES (?, 'mensal', ?, ?, ?)",
        [`Escala ${nomeMes}`, `${ano}-${mes}-01`, `${ano}-${mes}-31`, req.user.id],
        function(err) {
            if (err) {
                console.error('Erro ao criar escala:', err);
                return res.status(500).json({ error: 'Erro ao criar escala' });
            }
            
            const escalaId = this.lastID;
            
            // Obter usuários disponíveis para distribuição
            db.all(
                "SELECT id, nome FROM users WHERE status = 'APPROVED' AND cargo IN ('SONOPLASTA', 'DIRETOR', 'ADMIN')",
                (err, users) => {
                    if (err) {
                        console.error('Erro ao obter usuários:', err);
                        return res.status(500).json({ error: 'Erro ao obter usuários' });
                    }
                    
                    if (users.length === 0) {
                        return res.status(400).json({ error: 'Nenhum usuário disponível para escala' });
                    }
                    
                    // Gerar datas específicas do mês para os dias selecionados
                    const datasEscala = gerarDatasEscala(mes, dias, users);
                    
                    // Inserir dias da escala com datas específicas
                    const insertPromises = datasEscala.map(data => {
                        return new Promise((resolve, reject) => {
                            db.run(
                                "INSERT INTO escala_dias (escala_id, dia_semana, data_especifica, usuario_id) VALUES (?, ?, ?, ?)",
                                [escalaId, data.dia_semana, data.data_especifica, data.usuario_id],
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
                                message: 'Escala mensal criada com sucesso',
                                escala_id: escalaId
                            });
                        })
                        .catch(err => {
                            console.error('Erro ao inserir dias da escala:', err);
                            res.status(500).json({ error: 'Erro ao criar dias da escala' });
                        });
                }
            );
        }
    );
});

// Atualizar dias de uma escala
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
            res.json({ message: 'Escala atualizada com sucesso' });
        })
        .catch(err => {
            console.error('Erro ao atualizar escala:', err);
            res.status(500).json({ error: 'Erro ao atualizar escala' });
        });
});

// Deletar escala
router.delete('/:id', checkAuth, checkAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(
        "DELETE FROM escalas WHERE id = ?",
        [id],
        function(err) {
            if (err) {
                console.error('Erro ao deletar escala:', err);
                return res.status(500).json({ error: 'Erro ao deletar escala' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Escala não encontrada' });
            }
            
            res.json({ message: 'Escala deletada com sucesso' });
        }
    );
});

// Função para gerar datas específicas da escala mensal
function gerarDatasEscala(mes, dias, users) {
    const result = [];
    let userIndex = 0;
    const ano = new Date().getFullYear();
    
    // Mapear dias da semana para números
    const diasSemanaMap = {
        'domingo': 0,
        'segunda': 1,
        'terca': 2,
        'quarta': 3,
        'quinta': 4,
        'sexta': 5,
        'sabado': 6
    };
    
    // Obter número de dias no mês
    const diasNoMes = new Date(ano, parseInt(mes), 0).getDate();
    
    // Para cada dia do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(ano, parseInt(mes) - 1, dia);
        const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
        
        // Verificar se este dia da semana está nos selecionados
        const diaSemanaNome = Object.keys(diasSemanaMap).find(key => diasSemanaMap[key] === diaSemana);
        
        if (dias.includes(diaSemanaNome)) {
            // Distribuir usuário em rodízio
            const assignedUser = users[userIndex % users.length];
            
            // Formatar data como YYYY-MM-DD
            const dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            
            result.push({
                dia_semana: diaSemanaNome,
                data_especifica: dataFormatada,
                usuario_id: assignedUser.id,
                usuario_nome: assignedUser.nome
            });
            
            userIndex++;
        }
    }
    
    return result;
}

// Função para distribuir usuários igualmente
function distributeUsersEqually(users, dias) {
    const result = [];
    let userIndex = 0;
    
    dias.forEach(dia => {
        // Distribuir em rodízio
        const assignedUser = users[userIndex % users.length];
        result.push({
            dia_semana: dia,
            usuario_id: assignedUser.id,
            usuario_nome: assignedUser.nome
        });
        userIndex++;
    });
    
    return result;
}

module.exports = router;
