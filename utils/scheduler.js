const cron = require('node-cron');
const supabase = require('../supabase');
const { sendPushToUser } = require('./push');

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().split('T')[0];
}

function hoje() {
    return new Date().toISOString().split('T')[0];
}

function amanha() {
    return addDays(hoje(), 1);
}

async function notificarEscalasDoDia(data, titulo, corpo) {
    // Buscar todos os dias de escala (semanal e evento) para a data
    const { data: dias } = await supabase
        .from('escala_dias')
        .select('usuario_id')
        .eq('data_especifica', data);

    if (!dias || dias.length === 0) return;

    const userIds = [...new Set(dias.map(d => d.usuario_id).filter(Boolean))];

    for (const userId of userIds) {
        await sendPushToUser(userId, {
            title: titulo,
            body: corpo,
            tag: `escala-${data}`,
            url: '/schedule'
        });
    }

    console.log(`[Scheduler] Notificações de escala enviadas para ${userIds.length} usuário(s) — data: ${data}`);
}

function iniciarScheduler() {
    // Às 20h: avisa sobre a escala de amanhã
    cron.schedule('0 20 * * *', async () => {
        const data = amanha();
        await notificarEscalasDoDia(
            data,
            'Escala amanhã — SoundHub',
            `Você tem escala amanhã (${data.split('-').reverse().join('/')}). Prepare-se!`
        );
    }, { timezone: 'America/Sao_Paulo' });

    // Às 7h: avisa sobre a escala de hoje
    cron.schedule('0 7 * * *', async () => {
        const data = hoje();
        await notificarEscalasDoDia(
            data,
            'Escala hoje — SoundHub',
            `Hoje é o seu dia de escala (${data.split('-').reverse().join('/')}). Bom trabalho!`
        );
    }, { timezone: 'America/Sao_Paulo' });

    console.log('[Scheduler] Cron jobs de notificação iniciados.');
}

module.exports = { iniciarScheduler };
