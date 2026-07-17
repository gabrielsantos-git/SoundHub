const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth, requireRoles } = require('../middleware/auth');

// Obtém o escala_id vinculado ao evento (cria um se não existir)
async function getOrCreateEscalaId(eventoId) {
    const { data: evento } = await supabase
        .from('eventos')
        .select('id, nome, data_inicio, data_fim, criado_por, escala_id')
        .eq('id', eventoId)
        .single();

    if (!evento) return null;
    if (evento.escala_id) return evento.escala_id;

    // Cria um registro em escalas para este evento
    const { data: novaEscala, error } = await supabase
        .from('escalas')
        .insert({
            nome: evento.nome,
            tipo: 'evento',
            data_inicio: evento.data_inicio,
            data_fim: evento.data_fim,
            criado_por: evento.criado_por
        })
        .select('id')
        .single();

    if (error || !novaEscala) return null;

    // Salva o escala_id no evento
    await supabase
        .from('eventos')
        .update({ escala_id: novaEscala.id })
        .eq('id', eventoId);

    return novaEscala.id;
}

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

        const escalaId = event.escala_id;
        let dias = [];

        if (escalaId) {
            const { data: days } = await supabase
                .from('escala_dias')
                .select('*')
                .eq('escala_id', escalaId)
                .order('data_especifica', { ascending: true });

            const userIds = Array.from(new Set((days || []).map(d => d.usuario_id).filter(Boolean)));
            const { data: users } = userIds.length
                ? await supabase.from('users').select('id, nome').in('id', userIds)
                : { data: [] };
            const userMap = new Map((users || []).map(u => [u.id, u.nome]));
            dias = (days || []).map(d => ({ ...d, usuario_nome: userMap.get(d.usuario_id) || null }));
        }

        event.dias = dias;
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter evento' });
    }
});

// Obter dias de um evento (gera automaticamente se não existirem ou lista de usuários mudou)
router.get('/:id/days', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const escalaId = await getOrCreateEscalaId(id);
        if (!escalaId) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        let { data: days } = await supabase
            .from('escala_dias')
            .select('*')
            .eq('escala_id', escalaId)
            .order('data_especifica', { ascending: true });

        // Buscar usuários ativos para checar se a lista mudou
        const { data: usersAtivos } = await supabase
            .from('users')
            .select('id, nome')
            .eq('status', 'APPROVED')
            .in('cargo', ['SONOPLASTA', 'DIRETOR']);

        const semDias = !days || days.length === 0;
        const userIdsEsperados = new Set((usersAtivos || []).map(u => String(u.id)));
        const userIdsNaDias = new Set((days || []).map(d => String(d.usuario_id)).filter(Boolean));
        const usuariosMudaram = [...userIdsEsperados].some(uid => !userIdsNaDias.has(uid)) ||
                                [...userIdsNaDias].some(uid => !userIdsEsperados.has(uid));

        if ((semDias || usuariosMudaram) && usersAtivos && usersAtivos.length > 0) {
            const { data: evento } = await supabase
                .from('eventos')
                .select('data_inicio, data_fim')
                .eq('id', id)
                .single();

            if (evento) {
                const hoje = new Date().toISOString().split('T')[0];
                const dataInicio = evento.data_inicio > hoje ? evento.data_inicio : hoje;

                // Remove dias futuros e regenera (preserva passados com atribuição manual)
                await supabase
                    .from('escala_dias')
                    .delete()
                    .eq('escala_id', escalaId)
                    .gte('data_especifica', dataInicio);

                const diasGerados = generateEventDays(
                    new Date(dataInicio + 'T00:00:00'),
                    new Date(evento.data_fim + 'T00:00:00'),
                    usersAtivos
                );

                if (diasGerados.length > 0) {
                    await supabase.from('escala_dias').insert(
                        diasGerados.map(d => ({
                            escala_id: escalaId,
                            dia_semana: d.dia_semana,
                            data_especifica: d.data_especifica,
                            usuario_id: d.usuario_id
                        }))
                    );
                }

                const { data: novosDias } = await supabase
                    .from('escala_dias')
                    .select('*')
                    .eq('escala_id', escalaId)
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
        // Criar registro em escalas primeiro (FK necessária para escala_dias)
        const { data: novaEscala, error: escalaError } = await supabase
            .from('escalas')
            .insert({
                nome,
                tipo: 'evento',
                data_inicio,
                data_fim,
                criado_por: req.user.id
            })
            .select('id')
            .single();

        if (escalaError || !novaEscala) {
            console.error('Erro ao criar escala do evento:', escalaError);
            return res.status(500).json({ error: 'Erro ao criar evento' });
        }

        const escalaId = novaEscala.id;

        // Criar o evento vinculado à escala
        const { data: insertedEvent, error: insertError } = await supabase
            .from('eventos')
            .insert({
                nome,
                descricao: descricao || '',
                data_inicio,
                data_fim,
                criado_por: req.user.id,
                escala_id: escalaId
            })
            .select('id')
            .single();

        if (insertError || !insertedEvent) {
            console.error('Erro Supabase ao criar evento:', insertError);
            // Limpar a escala criada se o evento falhou
            await supabase.from('escalas').delete().eq('id', escalaId);
            return res.status(500).json({ error: 'Erro ao criar evento' });
        }

        const eventoId = insertedEvent.id;

        // Gerar dias com os sonoplastas/diretores aprovados
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

            if (dias.length > 0) {
                await supabase.from('escala_dias').insert(
                    dias.map(d => ({
                        escala_id: escalaId,
                        dia_semana: d.dia_semana,
                        data_especifica: d.data_especifica,
                        usuario_id: d.usuario_id
                    }))
                );
            }
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
            .select('id, escala_id');

        if (error || !data || data.length === 0) {
            return res.status(500).json({ error: 'Erro ao atualizar evento' });
        }

        // Atualiza também o registro de escalas vinculado
        if (data[0].escala_id) {
            await supabase
                .from('escalas')
                .update({ nome, data_inicio, data_fim })
                .eq('id', data[0].escala_id);
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
        const escalaId = await getOrCreateEscalaId(parseInt(id));
        if (!escalaId) return res.status(404).json({ error: 'Evento não encontrado' });

        for (const day of days) {
            await supabase
                .from('escala_dias')
                .update({ usuario_id: day.usuario_id })
                .eq('id', day.id)
                .eq('escala_id', escalaId);
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

        const { data: evento } = await supabase
            .from('eventos')
            .select('escala_id')
            .eq('id', eventId)
            .single();

        // Deletar dias e escala vinculada
        if (evento?.escala_id) {
            await supabase.from('escala_dias').delete().eq('escala_id', evento.escala_id);
            await supabase.from('escalas').delete().eq('id', evento.escala_id);
        }

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

// Regenera dias futuros de todos os eventos ativos quando a lista de usuários muda
async function recriarDiasEventosFuturos() {
    const hoje = new Date().toISOString().split('T')[0];

    const { data: eventos } = await supabase
        .from('eventos')
        .select('id, data_inicio, data_fim, escala_id')
        .gte('data_fim', hoje);

    if (!eventos || eventos.length === 0) return;

    const { data: users } = await supabase
        .from('users')
        .select('id, nome')
        .eq('status', 'APPROVED')
        .in('cargo', ['SONOPLASTA', 'DIRETOR']);

    if (!users || users.length === 0) return;

    for (const evento of eventos) {
        const escalaId = evento.escala_id || (await getOrCreateEscalaId(evento.id));
        if (!escalaId) continue;

        const dataInicio = evento.data_inicio > hoje ? evento.data_inicio : hoje;

        await supabase
            .from('escala_dias')
            .delete()
            .eq('escala_id', escalaId)
            .gte('data_especifica', dataInicio);

        const dias = generateEventDays(
            new Date(dataInicio + 'T00:00:00'),
            new Date(evento.data_fim + 'T00:00:00'),
            users
        );

        if (dias.length > 0) {
            await supabase.from('escala_dias').insert(
                dias.map(d => ({
                    escala_id: escalaId,
                    dia_semana: d.dia_semana,
                    data_especifica: d.data_especifica,
                    usuario_id: d.usuario_id
                }))
            );
        }
    }
}

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

function getDayOfWeek(dayNumber) {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return days[dayNumber];
}

module.exports = router;
module.exports.recriarDiasEventosFuturos = recriarDiasEventosFuturos;
