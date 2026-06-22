const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth, requireRoles } = require('../middleware/auth');

// Listar escalas — apenas mês atual + próximo mês; dispara geração automática
router.get('/', requireAuth, async (req, res) => {
    try {
        verificarEGerarEscalaAutomatica().catch(() => {});

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        const mesProximo = mesAtual === 12 ? 1 : mesAtual + 1;
        const anoProximo = mesAtual === 12 ? anoAtual + 1 : anoAtual;

        const dataAtual  = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
        const dataProximo = `${anoProximo}-${String(mesProximo).padStart(2, '0')}-01`;

        const { data: schedules, error } = await supabase
            .from('escalas')
            .select('*')
            .in('data_inicio', [dataAtual, dataProximo])
            .order('data_inicio', { ascending: true });

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
    
    // Mês e ano atuais
    const agora = new Date();
    const mesNum = agora.getMonth() + 1; // 1-indexed
    const ano    = agora.getFullYear();
    const mes    = String(mesNum).padStart(2, '0');

    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const nomeMes = MESES[agora.getMonth()];

    try {
        const lastDay   = new Date(ano, mesNum, 0).getDate(); // último dia do mês
        const dataInicio = `${ano}-${mes}-01`;
        const dataFim    = `${ano}-${mes}-${String(lastDay).padStart(2, '0')}`;

        // Impedir escala duplicada para o mesmo mês
        const { data: existente } = await supabase
            .from('escalas')
            .select('id')
            .eq('data_inicio', dataInicio)
            .limit(1);

        if (existente && existente.length > 0) {
            return res.status(400).json({ error: 'Já existe uma escala para este mês' });
        }

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
            .in('cargo', ['SONOPLASTA', 'DIRETOR']);

        if (usersError) {
            return res.status(500).json({ error: 'Erro ao obter usuários' });
        }

        if (!users || users.length === 0) {
            return res.status(400).json({ error: 'Nenhum usuário disponível para escala' });
        }

        const datasEscala = gerarDatasEscala(mes, dias, users, ano);

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

// Flag para evitar geração simultânea (race condition)
let _gerando = false;

// Verifica se é o penúltimo sábado e gera escala do próximo mês
async function verificarEGerarEscalaAutomatica() {
    if (_gerando) return;
    _gerando = true;
    try {
        await _gerarSeNecessario();
    } finally {
        _gerando = false;
    }
}

async function _gerarSeNecessario() {
    const hoje = new Date();
    const anoHoje  = hoje.getFullYear();
    const mesHoje  = hoje.getMonth();       // 0-indexed
    const diaHoje  = hoje.getDate();

    const penultimoSabado = getPenultimoSabado(anoHoje, mesHoje);
    if (!penultimoSabado) return;

    // Só age a partir do penúltimo sábado do mês atual
    if (diaHoje < penultimoSabado.getDate()) return;

    // Calcular próximo mês corretamente
    const mesProxIdx = mesHoje === 11 ? 0 : mesHoje + 1;   // 0-indexed
    const anoProximo = mesHoje === 11 ? anoHoje + 1 : anoHoje;
    const mesProxNum = mesProxIdx + 1;                       // 1-indexed (1–12)
    const mesProxStr = String(mesProxNum).padStart(2, '0'); // "01"–"12"

    const dataInicioProximo = `${anoProximo}-${mesProxStr}-01`;

    // Verificar duplicata
    const { data: existing } = await supabase
        .from('escalas')
        .select('id')
        .eq('data_inicio', dataInicioProximo)
        .limit(1);

    if (existing && existing.length > 0) return;

    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const nomeProximoMes = MESES[mesProxIdx];

    // Último dia do próximo mês: new Date(ano, mesNum, 0) dá o último dia do mês anterior a mesNum
    const ultimoDia = new Date(anoProximo, mesProxNum, 0).getDate();
    const dataFim = `${anoProximo}-${mesProxStr}-${String(ultimoDia).padStart(2, '0')}`;

    const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .in('cargo', ['ADMIN', 'DIRETOR'])
        .eq('status', 'APPROVED')
        .limit(1)
        .single();

    if (!adminUser) return;

    const { data: novaEscala, error: insertError } = await supabase
        .from('escalas')
        .insert({
            nome: `Escala ${nomeProximoMes}`,
            tipo: 'mensal',
            data_inicio: dataInicioProximo,
            data_fim: dataFim,
            criado_por: adminUser.id
        })
        .select('id')
        .single();

    if (insertError || !novaEscala) return;

    // Verificar se os dias já foram criados (segunda proteção contra duplicata)
    const { data: diasExistentes } = await supabase
        .from('escala_dias')
        .select('id')
        .eq('escala_id', novaEscala.id)
        .limit(1);

    if (diasExistentes && diasExistentes.length > 0) return;

    const { data: users } = await supabase
        .from('users')
        .select('id, nome')
        .eq('status', 'APPROVED')
        .in('cargo', ['SONOPLASTA', 'DIRETOR']);

    if (!users || users.length === 0) return;

    const datasEscala = gerarDatasEscala(mesProxStr, ['sabado', 'domingo', 'quarta'], users, anoProximo);

    await supabase.from('escala_dias').insert(
        datasEscala.map(d => ({
            escala_id: novaEscala.id,
            dia_semana: d.dia_semana,
            data_especifica: d.data_especifica,
            usuario_id: d.usuario_id
        }))
    );
}

// Calcula o penúltimo sábado de um mês/ano
function getPenultimoSabado(ano, mes) {
    const sabados = [];
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(ano, mes, dia);
        if (data.getDay() === 6) sabados.push(data); // 6 = sábado
    }

    return sabados[sabados.length - 2]; // penúltimo sábado
}

// Gera os dias da escala para um mês/ano com rodízio equilibrado por tipo de dia.
// mes: string "01"–"12" | ano: number
// dias: array de nomes, ex: ['sabado', 'domingo', 'quarta']
// users: array de { id, nome }
//
// Rodízio: para cada tipo de dia (sabado, domingo, quarta) o índice inicial é
// deslocado, garantindo que nenhum usuário fique preso sempre no mesmo dia da semana.
function gerarDatasEscala(mes, dias, users, ano) {
    if (!ano) ano = new Date().getFullYear();

    const mesNum = parseInt(mes, 10); // 1-indexed
    const anoNum = parseInt(ano, 10);

    const DIA_SEMANA = {
        'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3,
        'quinta': 4, 'sexta': 5, 'sabado': 6
    };

    // 1. Agrupar todas as datas do mês por tipo de dia
    const grupos = {};
    for (const nomeDia of dias) grupos[nomeDia] = [];

    const ultimoDia = new Date(anoNum, mesNum, 0).getDate(); // new Date(ano, mes, 0) = último dia do mês mesNum

    for (let d = 1; d <= ultimoDia; d++) {
        // Usa UTC para evitar variação de fuso horário no servidor
        const diaSemana = new Date(Date.UTC(anoNum, mesNum - 1, d)).getUTCDay();
        const nomeDia = Object.keys(DIA_SEMANA).find(k => DIA_SEMANA[k] === diaSemana);
        if (nomeDia && grupos[nomeDia] !== undefined) {
            const dataStr = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            grupos[nomeDia].push(dataStr);
        }
    }

    // 2. Para cada tipo de dia, atribuir usuários em rodízio com offset diferente
    //    Isso evita que a mesma pessoa caia sempre no mesmo dia da semana.
    const result = [];
    let offset = 0;

    for (const nomeDia of dias) {
        const datas = grupos[nomeDia];
        for (let i = 0; i < datas.length; i++) {
            const user = users[(i + offset) % users.length];
            result.push({
                dia_semana: nomeDia,
                data_especifica: datas[i],
                usuario_id: user.id,
                usuario_nome: user.nome
            });
        }
        offset = (offset + 1) % users.length; // cada tipo de dia começa num usuário diferente
    }

    // 3. Ordenar por data para facilitar visualização
    result.sort((a, b) => a.data_especifica.localeCompare(b.data_especifica));
    return result;
}

// Reajusta as escalas ativas incluindo um novo usuário
// Encontra o sonoplasta com mais dias e cede um dia futuro para o novo usuário
async function reajustarEscalasParaNovoUsuario(userId) {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    const mesProximo = mesAtual === 12 ? 1 : mesAtual + 1;
    const anoProximo = mesAtual === 12 ? anoAtual + 1 : anoAtual;

    const dataAtual   = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
    const dataProximo = `${anoProximo}-${String(mesProximo).padStart(2, '0')}-01`;

    const { data: escalas } = await supabase
        .from('escalas')
        .select('id')
        .in('data_inicio', [dataAtual, dataProximo]);

    if (!escalas || escalas.length === 0) return;

    const hojeStr = hoje.toISOString().split('T')[0];

    for (const escala of escalas) {
        const { data: dias } = await supabase
            .from('escala_dias')
            .select('id, usuario_id, data_especifica')
            .eq('escala_id', escala.id)
            .order('data_especifica', { ascending: true });

        if (!dias || dias.length === 0) continue;

        // Contar dias por usuário
        const contagem = {};
        for (const dia of dias) {
            if (dia.usuario_id) {
                contagem[dia.usuario_id] = (contagem[dia.usuario_id] || 0) + 1;
            }
        }

        // Usuário com mais dias
        const maisAtarefadoId = Object.entries(contagem)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        if (!maisAtarefadoId) continue;

        // Primeiro dia futuro desse usuário
        const diaParaCeder = dias.find(d =>
            String(d.usuario_id) === String(maisAtarefadoId) &&
            d.data_especifica >= hojeStr
        );

        if (!diaParaCeder) continue;

        await supabase
            .from('escala_dias')
            .update({ usuario_id: userId })
            .eq('id', diaParaCeder.id);
    }
}

module.exports = router;
module.exports.reajustarEscalasParaNovoUsuario = reajustarEscalasParaNovoUsuario;
