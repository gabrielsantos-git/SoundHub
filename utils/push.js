const webpush = require('web-push');
const supabase = require('../supabase');

webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function sendPush(sub, payload) {
    try {
        await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
        );
    } catch (err) {
        // Subscription expirada — remove do banco
        if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
    }
}

async function sendPushToUser(userId, payload) {
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('usuario_id', userId);

    for (const sub of (subs || [])) {
        await sendPush(sub, payload);
    }
}

async function sendPushToRoles(roles, payload) {
    const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('status', 'APPROVED')
        .in('cargo', roles);

    for (const user of (users || [])) {
        await sendPushToUser(user.id, payload);
    }
}

module.exports = { sendPushToUser, sendPushToRoles };
