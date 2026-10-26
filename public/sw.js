// Service worker só para Web Push. A casca do app não entra em cache:
// o build da web é um SPA e o HTML antigo do PWA não se aplica aqui.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = {};
  }
  const opcoes = {
    body: dados.body || '',
    icon: dados.icon || '/favicon.png',
    badge: '/favicon.png',
    data: { url: dados.url || '/' },
  };
  if (dados.tag) opcoes.tag = dados.tag;
  event.waitUntil(self.registration.showNotification(dados.title || 'Futebol', opcoes));
});

function caminhoDoApp(dataUrl) {
  const raw = String(dataUrl || '/');
  const hashAt = raw.indexOf('#');
  const hash = hashAt >= 0 ? raw.slice(hashAt) : '';
  const jogo = hash.match(/^#\/c\/([a-z0-9._]+)\/escalacao\/(\d+)$/);
  if (jogo) return `/jogo/${jogo[1]}/${jogo[2]}`;
  if (hash === '#/hoje') return '/hoje';
  if (hash === '#/favoritos') return '/favoritos';
  const comp = hash.match(/^#\/c\/([a-z0-9._]+)\/(tabela|resultados|proximos|artilheiros)$/);
  if (comp) return `/competicao/${comp[1]}`;
  if (raw.startsWith('/') && hashAt !== 0) return raw.split('#')[0] || '/';
  return '/';
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(
    caminhoDoApp(event.notification.data && event.notification.data.url),
    self.location.origin,
  ).href;
  event.waitUntil((async () => {
    const lista = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const cliente of lista) {
      if (new URL(cliente.url).origin !== self.location.origin) continue;
      if ('navigate' in cliente) {
        try { await cliente.navigate(destino); } catch { /* a janela segue aberta */ }
      }
      return cliente.focus();
    }
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});
