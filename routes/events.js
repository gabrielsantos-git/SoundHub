const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth, requireRoles } = require('../middleware/auth');

// Listar eventos
router.get('/', requireAuth, async (req, res) => {
    try {
        const { data: events, error } = await supabase
            .from('eventos')
            .select('*')
            .order('data_inicio', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Erro ao listar eventos' });
        }

        res.json(events || []);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar eventos' });
    }
});

// Obter evento específico
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const { data: event, error } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !event) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const { data: days, error: daysError } = await supabase
            .from('escala_dias')
            .select('*')
            .eq('escala_id', id)
            .order('data_especifica', { ascending: true });

        if (daysError) {
            return res.status(500).json({ error: 'Erro ao obter dias do evento' });
        }

        const userIds = Array.from(new Set((days || []).map(d => d.usuario_id).filter(Boolean)));
        const { data: users } = userIds.length
            ? await supabase.from('users').select('id, nome').in('id', userIds)
            : { data: [] };
        const userMap = new Map((users || []).map(u => [u.id, u.nome]));

        event.dias = (days || []).map(d => ({ ...d, usuario_nome: userMap.get(d.usuario_id) || null }));
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter evento' });
    }
});

// Obter dias de um evento (gera automaticamente se não existirem)
router.get('/:id/days', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        let { data: days, error } = await supabase
            .from('escala_dias')
            .select('*')
            .eq('escala_id', id)
            .order('data_especifica', { ascending: true });

        if (error) {
            return res.status(500).json({ error: 'Erro ao obter dias do evento' });
        }

        // Buscar usuários ativos para checar se a lista mudou
        const { data: usersAtivos } = await supabase
            .from('users')
            .select('id, nome')
            .eq('status', 'APPROVED')
            .in('cargo', ['SONOPLASTA', 'DIRETOR']);

        const semDias = !days || days.length === 0;
        const userIdsEsperados = new Set((usersAtivos || []).map(u => String(u.id)));
        const userIdsNaDias = new Set((days || []).map(d => String(d.usuario_id)).filter(Boolean));
        const usuariosMudaram = [...userIdsEsperados].some(id => !userIdsNaDias.has(id)) ||
                                [...userIdsNaDias].some(id => !userIdsEsperados.has(id));

        if (semDias || usuariosMudaram) {
            const { data: evento } = await supabase
                .from('eventos')
                .select('data_inicio, data_fim')
                .eq('id', id)
                .single();

            if (evento && usersAtivos && usersAtivos.length > 0) {
                const hoje = new Date().toISOString().split('T')[0];
                const dataInicio = evento.data_inicio > hoje ? evento.data_inicio : hoje;

                // Remover dias futuros e regenerar (preserva dias passados com atribuição manual)
                await supabase
                    .from('escala_dias')
                    .delete()
                    .eq('escala_id', id)
                    .gte('data_especifica', dataInicio);

                const diasGerados = generateEventDays(
                    new Date(dataInicio + 'T00:00:00'),
                    new Date(evento.data_fim + 'T00:00:00'),
                    usersAtivos
                );

                if (diasGerados.length > 0) {
                    await supabase.from('escala_dias').insert(
                        diasGerados.map(d => ({
                            escala_id: id,
                            dia_semana: d.dia_semana,
                            data_especifica: d.data_especifica,
                            usuario_id: d.usuario_id
                        }))
                    );
                }

                const { data: novosDias } = await supabase
                    .from('escala_dias')
                    .select('*')
                    .eq('escala_id', id)
                    .order('data_especifica', { ascending: true });

                days = novosDias || [];
            }
        }

        const userIds = Array.from(new Set((days || []).map(d => d.usuario_id).filter(Boolean)));
        const { data: users } = userIds.length
            ? await supabase.from('users').select('id, nome').in('id', userIds)
            : { data: [] };
        const userMap = new Map((users || []).map(u => [u.id, u.nome]));

        res.json((days || []).map(d => ({ ...d, usuario_nome: userMap.get(d.usuario_id) || null })));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter dias do evento' });
    }
});

// Criar novo evento
router.post('/', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
    const { nome, descricao, data_inicio, data_fim } = req.body;

    if (!nome || !data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Nome, data de início e data de término são obrigatórios' });
    }

    if (data_inicio > data_fim) {
        return res.status(400).json({ error: 'Data de início deve ser anterior à data de término' });
    }

    try {
        const { data: insertedEvent, error: insertError } = await supabase
            .from('eventos')
            .insert({
                nome,
                descricao: descricao || '',
                data_inicio,
                data_fim,
                criado_por: req.user.id
            })
            .select('id')
            .single();

        if (insertError || !insertedEvent) {
            console.error('Erro Supabase ao criar evento:', insertError);
            return res.status(500).json({ error: 'Erro ao criar evento' });
        }

        const eventoId = insertedEvent.id;

        // Buscar sonoplastas e diretores aprovados para montar a escala
        const { data: users } = await supabase
            .from('users')
            .select('id, nome')
            .eq('status', 'APPROVED')
            .in('cargo', ['SONOPLASTA', 'DIRETOR']);

        if (users && users.length > 0) {
            const dias = generateEventDays(
                new Date(data_inicio + 'T00:00:00'),
                new Date(data_fim + 'T00:00:00'),
                users
            );

            await supabase.from('escala_dias').insert(
                dias.map(d => ({
                    escala_id: eventoId,
                    dia_semana: d.dia_semana,
                    data_especifica: d.data_especifica,
                    usuario_id: d.usuario_id
                }))
            );
        }

        res.json({ message: 'Evento criado com sucesso', evento_id: eventoId });
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).json({ error: 'Erro ao criar evento' });
    }
});

// Atualizar evento
router.put('/:id', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, data_inicio, data_fim } = req.body;

    if (!nome || !data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Nome, data de início e data de término são obrigatórios' });
    }

    try {
        const { data, error } = await supabase
            .from('eventos')
            .update({ nome, descricao: descricao || '', data_inicio, data_fim })
            .eq('id', parseInt(id))
            .select('id');

        if (error || !data || data.length === 0) {
            return res.status(500).json({ error: 'Erro ao atualizar evento' });
        }

        res.json({ message: 'Evento atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
});

// Atualizar dias de um evento
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
        res.json({ message: 'Evento atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
});

// Deletar evento
router.delete('/:id', requireAuth, requireRoles(['ADMIN', 'DIRETOR']), async (req, res) => {
    const { id } = req.params;
    try {
        const eventId = parseInt(id);
        await supabase.from('escala_dias').delete().eq('escala_id', eventId);
        const { data, error } = await supabase.from('eventos').delete().eq('id', eventId).select('id');

        if (error) {
            return res.status(500).json({ error: 'Erro ao deletar evento' });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        res.json({ message: 'Evento deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar evento' });
    }
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

// Regenera dias futuros de todos os eventos ativos quando a lista de usuários muda
async function recriarDiasEventosFuturos() {
    const hoje = new Date().toISOString().split('T')[0];

    const { data: eventos } = await supabase
        .from('eventos')
        .select('id, data_inicio, data_fim')
        .gte('data_fim', hoje);

    if (!eventos || eventos.length === 0) return;

    const { data: users } = await supabase
        .from('users')
        .select('id, nome')
        .eq('status', 'APPROVED')
        .in('cargo', ['SONOPLASTA', 'DIRETOR']);

    if (!users || users.length === 0) return;

    for (const evento of eventos) {
        const dataInicio = evento.data_inicio > hoje ? evento.data_inicio : hoje;

        await supabase
            .from('escala_dias')
            .delete()
            .eq('escala_id', evento.id)
            .gte('data_especifica', dataInicio);

        const dias = generateEventDays(
            new Date(dataInicio + 'T00:00:00'),
            new Date(evento.data_fim + 'T00:00:00'),
            users
        );

        if (dias.length > 0) {
            await supabase.from('escala_dias').insert(
                dias.map(d => ({
                    escala_id: evento.id,
                    dia_semana: d.dia_semana,
                    data_especifica: d.data_especifica,
                    usuario_id: d.usuario_id
                }))
            );
        }
    }
}

module.exports = router;
module.exports.recriarDiasEventosFuturos = recriarDiasEventosFuturos;
