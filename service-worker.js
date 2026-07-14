// Força a ativação imediata para substituir versões antigas
self.addEventListener('install', () => self.skipWaiting());

// Limpa caches antigos ao ativar (sem clients.claim para não interromper navegações)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
});

// Recebe e exibe notificações push
self.addEventListener('push', event => {
    if (!event.data) return;
    const data = event.data.json();

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/assets/SounHub-03.png',
            badge: '/assets/SounHub-03.png',
            tag: data.tag || 'soundhub',
            renotify: true,
            data: { url: data.url || '/' }
        })
    );
});

// Clique na notificação: abre/foca a página correta
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
