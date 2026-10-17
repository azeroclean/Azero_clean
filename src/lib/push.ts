// Notificações push do admin: funcionam com o site fechado
// (barra de tarefas do Windows/Mac, Android; no iPhone só com o app instalado na tela de início).

export type PushStatus = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

const FUNCTION = 'notify-admin-push'

// Com o push ativo, o painel não mostra a notificação local (evita aviso duplicado).
let pushActive = false
export const isPushActive = () => pushActive

async function getClient() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Supabase não configurado')
  }
  const { supabase } = await import('./supabase')
  return supabase
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js')
}

export async function getPushStatus(): Promise<PushStatus> {
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  pushActive = Boolean(sub) && Notification.permission === 'granted'
  return pushActive ? 'on' : 'off'
}

function base64UrlToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function functionError(error: { message: string; context?: Response }) {
  try {
    const body = await error.context?.json()
    if (body?.missing) return `${body.error}: ${body.missing.join(', ')}`
    if (body?.error) return body.error as string
  } catch {
    // mantém a mensagem padrão
  }
  return error.message
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Este navegador não suporta notificações.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permissão negada. Libere as notificações nas configurações do navegador.')
  }

  const supabase = await getClient()
  const { data, error } = await supabase.functions.invoke(FUNCTION, { method: 'GET' })
  if (error) throw new Error(`Push ainda não configurado no Supabase (${await functionError(error)}).`)
  const publicKey = (data as { publicKey?: string })?.publicKey
  if (!publicKey) throw new Error('Chave pública de push não encontrada.')

  const reg = await registration()
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    })
  }

  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Faça login de novo.')

  const { error: saveError } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' }
  )
  if (saveError) {
    throw new Error(
      saveError.code === '42P01'
        ? 'Rode supabase/push-notificacoes.sql no Supabase.'
        : `Não foi possível salvar o aparelho: ${saveError.message}`
    )
  }
  pushActive = true
}

export async function disablePush(): Promise<void> {
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const supabase = await getClient()
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  pushActive = false
}

export async function sendTestPush(): Promise<void> {
  const supabase = await getClient()
  const { error } = await supabase.functions.invoke(FUNCTION, { body: { test: true } })
  if (error) throw new Error(await functionError(error))
}
