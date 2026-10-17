// Edge Function: notificação push para o admin (aparece com o site fechado).
//
//   GET                      -> devolve a chave pública VAPID (o painel usa para ativar)
//   POST { id }              -> chamada pelo banco a cada novo agendamento (push-notificacoes.sql)
//   POST { test: true }      -> chamada pelo painel (admin logado) para mandar um teste
//
// Deploy: supabase functions deploy notify-admin-push --project-ref <ref>
// Secrets (gere as chaves com: npx web-push generate-vapid-keys):
//   VAPID_PUBLIC_KEY     chave pública
//   VAPID_PRIVATE_KEY    chave privada (nunca vai para o site)
//   VAPID_SUBJECT        (opcional) mailto:seu@email.com
//   WEBHOOK_SECRET       (opcional) o mesmo usado no send-whatsapp
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.
//
// Passo a passo: supabase/PUSH-SETUP.md

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const env = (name: string) => (Deno.env.get(name) ?? '').trim()

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  const line = `[notify-admin-push] ${status} ${JSON.stringify(body)}`
  if (status >= 400) console.error(line)
  else console.log(line)
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface Payload {
  title: string
  body: string
  tag: string
  url: string
}

function formatDate(iso: string) {
  const [, month, day] = iso.split('-')
  const weekday = new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  return `${weekday.replace('.', '')} ${day}/${month}`
}

// Envia para todos os aparelhos e apaga os que expiraram (navegador desinstalado etc.)
// deno-lint-ignore no-explicit-any
async function sendToAll(supabase: any, subs: SubscriptionRow[], payload: Payload) {
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: 'high' }
      )
    )
  )

  const expired = subs
    .filter((_, i) => {
      const r = results[i]
      const code = r.status === 'rejected' ? (r.reason as { statusCode?: number })?.statusCode : 0
      return code === 404 || code === 410
    })
    .map((s) => s.id)
  if (expired.length > 0) await supabase.from('push_subscriptions').delete().in('id', expired)

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String((r.reason as { body?: string })?.body ?? r.reason))
  return { sent, total: subs.length, expired: expired.length, errors }
}

// deno-lint-ignore no-explicit-any
async function adminUserId(req: Request, supabase: any): Promise<string | null> {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return null
  const { data } = await supabase.auth.getUser(jwt)
  const userId = data?.user?.id
  if (!userId) return null
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).maybeSingle()
  return admin ? userId : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const publicKey = env('VAPID_PUBLIC_KEY')
  const privateKey = env('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) {
    const missing = [!publicKey && 'VAPID_PUBLIC_KEY', !privateKey && 'VAPID_PRIVATE_KEY'].filter(Boolean)
    return json({ error: 'Push não configurado', missing }, 500)
  }

  if (req.method === 'GET') return json({ publicKey })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:contato@azeroclean.com.br', publicKey, privateKey)
  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

  try {
    const body = (await req.json()) as { id?: string; test?: boolean }

    // Teste pelo painel: só para os aparelhos do próprio admin
    if (body.test) {
      const userId = await adminUserId(req, supabase)
      if (!userId) return json({ error: 'não autorizado' }, 401)
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId)
      if (!subs?.length) return json({ error: 'Nenhum aparelho com notificações ativas' }, 404)
      const result = await sendToAll(supabase, subs, {
        title: '✅ Notificações funcionando',
        body: 'Você vai receber um aviso aqui a cada novo agendamento.',
        tag: 'azero-teste',
        url: '/admin',
      })
      return json({ ok: result.sent > 0, ...result })
    }

    // Chamada do banco (novo agendamento)
    const webhookSecret = env('WEBHOOK_SECRET')
    if (webhookSecret && req.headers.get('x-webhook-secret') !== webhookSecret) {
      return json({ error: 'não autorizado' }, 401)
    }
    if (!body.id) return json({ error: 'id ausente' }, 400)

    const { data: apt } = await supabase
      .from('appointments')
      .select('id, client_name, date, time, service_ids, status')
      .eq('id', body.id)
      .maybeSingle()
    if (!apt) return json({ error: 'agendamento não encontrado' }, 404)

    let services = ''
    if (Array.isArray(apt.service_ids) && apt.service_ids.length > 0) {
      const { data: rows } = await supabase.from('services').select('title').in('id', apt.service_ids)
      services = (rows ?? []).map((r: { title: string }) => r.title).join(', ')
    }

    const { data: subs } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth')
    if (!subs?.length) return json({ skipped: true, reason: 'nenhum aparelho com notificações ativas' })

    const result = await sendToAll(supabase, subs, {
      title: '🔔 Novo agendamento — confirme',
      body: `${apt.client_name} · ${formatDate(apt.date)} às ${apt.time}${services ? `\n${services}` : ''}`,
      tag: `agendamento-${apt.id}`,
      url: '/admin',
    })
    return json({ ok: result.sent > 0, ...result })
  } catch (err) {
    return json({ error: 'falha ao enviar push', detail: String(err) }, 500)
  }
})
