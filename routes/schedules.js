const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth, requireRoles } = require('../middleware/auth');

// Listar escalas semanais
router.get('/', requireAuth, async (req, res) => {
    try {
        const { data: schedules, error } = await supabase
            .from('escalas')
            .select('*')
            .order('data_inicio', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Erro ao listar escalas' });
        }

        res.json(schedules || []);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar escalas' });
    }
});

// Obter escala específica
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const { data: schedule, error } = await supabase
            .from('escalas')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !schedule) {
            return res.status(404).json({ error: 'Escala não encontrada' });
        }

        const { data: days, error: daysError } = await supabase
            .from('escala_dias')
            .select('*')
            .eq('escala_id', id)
            .order('dia_semana', { ascending: true });

        if (daysError) {
            return res.status(500).json({ error: 'Erro ao obter dias da escala' });
        }

        const userIds = Array.from(new Set((days || []).map(d => d.usuario_id).filter(Boolean)));
        const { data: users } = userIds.length
            ? await supabase.from('users').select('id, nome').in('id', userIds)
            : { data: [] };
        const userMap = new Map((users || []).map(u => [u.id, u.nome]));

        schedule.dias = (days || []).map(d => ({ ...d, usuario_nome: userMap.get(d.usuario_id) || null }));
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter escala' });
    }
});

// Obter dias de uma escala
router.get('/:id/days', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const { data: days, error } = await supabase
            .from('escala_dias')
            .select('*')
            .eq('escala_id', id)
            .order('dia_semana', { ascending: true });

        if (error) {
            return res.status(500).json({ error: 'Erro ao obter dias da escala' });
        }

        const userIds = Array.from(new Set((days || []).map(d => d.usuario_id).filter(Boolean)));
        const { data: users } = userIds.length
            ? await supabase.from('users').select('id, nome').in('id', userIds)
            : { data: [] };
        const userMap = new Map((users || []).map(u => [u.id, u.nome]));

        res.json((days || []).map(d => ({ ...d, usuario_nome: userMap.get(d.usuario_id) || null })));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter dias da escala' });
    }
});

// Criar nova escala mensal
router.post('/', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
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
    
    try {
        const lastDay = new Date(ano, parseInt(mes, 10), 0).getDate();
        const dataInicio = `${ano}-${mes}-01`;
        const dataFim = `${ano}-${mes}-${String(lastDay).padStart(2, '0')}`;

        const { data: insertedSchedule, error: insertError } = await supabase
            .from('escalas')
            .insert({
                nome: `Escala ${nomeMes}`,
                tipo: 'mensal',
                data_inicio: dataInicio,
                data_fim: dataFim,
                criado_por: req.user.id
            })
            .select('id')
            .single();

        if (insertError || !insertedSchedule) {
            return res.status(500).json({ error: 'Erro ao criar escala' });
        }

        const escalaId = insertedSchedule.id;

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, nome')
            .eq('status', 'APPROVED')
            .in('cargo', ['SONOPLASTA', 'DIRETOR', 'ADMIN']);

        if (usersError) {
            return res.status(500).json({ error: 'Erro ao obter usuários' });
        }

        if (!users || users.length === 0) {
            return res.status(400).json({ error: 'Nenhum usuário disponível para escala' });
        }

        const datasEscala = gerarDatasEscala(mes, dias, users);

        const { error: insertDaysError } = await supabase.from('escala_dias').insert(
            datasEscala.map(d => ({
                escala_id: escalaId,
                dia_semana: d.dia_semana,
                data_especifica: d.data_especifica,
                usuario_id: d.usuario_id
            }))
        );

        if (insertDaysError) {
            return res.status(500).json({ error: 'Erro ao criar dias da escala' });
        }

        res.json({ message: 'Escala mensal criada com sucesso', escala_id: escalaId });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar escala' });
    }
});

// Atualizar dias de uma escala
router.put('/:id/days', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
    const { id } = req.params;
    const { days } = req.body;
    
    if (!days || !Array.isArray(days)) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    
    try {
        for (const day of days) {
            await supabase
                .from('escala_dias')
                .update({ usuario_id: day.usuario_id })
                .eq('id', day.id)
                .eq('escala_id', parseInt(id));
        }
        res.json({ message: 'Escala atualizada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar escala' });
    }
});

// Deletar escala
router.delete('/:id', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
    const { id } = req.params;
    try {
        const escalaId = parseInt(id);
        await supabase.from('escala_dias').delete().eq('escala_id', escalaId);
        const { data, error } = await supabase.from('escalas').delete().eq('id', escalaId).select('id');

        if (error) {
            return res.status(500).json({ error: 'Erro ao deletar escala' });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Escala não encontrada' });
        }

        res.json({ message: 'Escala deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar escala' });
    }
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
