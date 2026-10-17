// Service worker da Azero Clean: recebe as notificações push do admin
// mesmo com o site fechado (barra de tarefas do Windows, Android, iPhone com o app instalado).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || '🔔 Novo agendamento'
  const options = {
    body: data.body || 'Abra o painel para confirmar.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || 'azero-agendamento',
    renotify: true,
    requireInteraction: true, // fica na tela até o admin clicar ou fechar
    vibrate: [200, 100, 200],
    data: { url: data.url || '/admin' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // se o painel já estiver aberto, só traz para frente
      const open = windows.find((w) => w.url.startsWith(new URL('/admin', self.location.origin).href))
      if (open) return open.focus()
      return self.clients.openWindow(url)
    })
  )
})
