const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// Retorna a chave pública VAPID para o frontend poder se inscrever
router.get('/vapid-public-key', (req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// Salva a subscription de push do usuário logado
router.post('/subscribe', requireAuth, async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Dados de subscription inválidos' });
    }

    // Upsert: atualiza se já existe para esse endpoint
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            usuario_id: req.user.id,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth
        }, { onConflict: 'endpoint' });

    if (error) {
        console.error('Erro ao salvar subscription:', error);
        return res.status(500).json({ error: 'Erro ao salvar subscription' });
    }

    res.json({ ok: true });
});

// Remove a subscription (quando usuário desativa notificações)
router.post('/unsubscribe', requireAuth, async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint ausente' });

    await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
        .eq('usuario_id', req.user.id);

    res.json({ ok: true });
});

module.exports = router;
