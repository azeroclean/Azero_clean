// Edge Function: envia mensagens de WhatsApp pela Evolution API ou pelo Z-API.
// O secret WHATSAPP_PROVIDER escolhe qual ("evolution" ou "zapi"; padrão: "zapi"),
// então dá para publicar esta versão sem mudar nada e trocar só pelo secret.
//
// Chamadas pelo banco (supabase/whatsapp-trigger.sql):
//   "novo"        -> cliente recebe "recebemos seu agendamento" e o dono recebe o aviso
//   "confirmado"  -> cliente recebe a confirmação
// Chamadas pelo painel admin (só com login de administrador):
//   "alterado"    -> cliente recebe o que mudou (serviços e/ou horário) e como ficou
//                    (body.previous = valores antigos; "reagendado" ainda é aceito)
//   "cancelado"   -> cliente recebe o aviso de cancelamento
//   body.note     -> recado opcional do admin, adicionado ao fim da mensagem
//
// Deploy: supabase functions deploy send-whatsapp --project-ref <ref>
// Secrets (Supabase > Edge Functions > Secrets, ou `supabase secrets set`):
//   WHATSAPP_PROVIDER    "evolution" ou "zapi" (padrão: "zapi")
//   -- Evolution API --
//   EVOLUTION_URL        endereço da sua Evolution, ex: https://wa.seudominio.com
//   EVOLUTION_API_KEY    AUTHENTICATION_API_KEY do .env (ou o hash da instância)
//   EVOLUTION_INSTANCE   nome da instância, ex: azero-clean
//   -- Z-API --
//   ZAPI_INSTANCE_ID     ID da instância (painel Z-API)
//   ZAPI_TOKEN           token da instância
//   ZAPI_CLIENT_TOKEN    token de segurança da conta (Z-API > Segurança), se estiver ativo
//   OWNER_WHATSAPP       número do dono com DDI, ex: 5588994396389 (sem ele, o dono
//                        não recebe o aviso de novo agendamento no WhatsApp)
//   WEBHOOK_SECRET       (opcional) se definido, o trigger precisa enviar o mesmo valor
//                        no header x-webhook-secret (veja supabase/whatsapp-trigger.sql)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.
//
// Passo a passo: supabase/EVOLUTION-SETUP.md (Evolution) e supabase/ZAPI-SETUP.md (Z-API)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Lidos a cada chamada (e sem espaços), para valer na hora em que o secret muda.
const env = (name: string) => (Deno.env.get(name) ?? '').trim()

const BUSINESS_NAME = 'Azero Clean'

type TriggerEvent = 'novo' | 'confirmado'
type AdminEvent = 'alterado' | 'reagendado' | 'cancelado'
type Event = TriggerEvent | AdminEvent
type Audience = 'dono' | 'cliente'

const TRIGGER_EVENTS: Event[] = ['novo', 'confirmado']
const ADMIN_EVENTS: Event[] = ['alterado', 'reagendado', 'cancelado']

interface RequestBody {
  id?: string
  event?: Event
  note?: string
  previous?: { date?: string; time?: string; services?: string }
}

interface AppointmentRow {
  id: string
  client_name: string
  client_phone: string
  vehicle_type: string | null
  date: string
  time: string
  total: number
  status: string
  service_ids: string[] | null
}

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  carro: 'Carro',
  caminhonete: 'Caminhonete',
}

function toWhatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function formatTotal(value: number) {
  const total = Number(value)
  if (!total) return 'a combinar'
  return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Todo resultado vai para Supabase > Edge Functions > send-whatsapp > Logs
function json(body: unknown, status = 200) {
  const line = `[send-whatsapp] ${status} ${JSON.stringify(body)}`
  if (status >= 400) console.error(line)
  else console.log(line)
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// O painel admin chama a função direto do navegador.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Provider = 'evolution' | 'zapi'

function provider(): Provider {
  return env('WHATSAPP_PROVIDER').toLowerCase() === 'evolution' ? 'evolution' : 'zapi'
}

const REQUIRED_SECRETS: Record<Provider, string[]> = {
  evolution: ['EVOLUTION_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE'],
  zapi: ['ZAPI_INSTANCE_ID', 'ZAPI_TOKEN'],
}

function sendText(phone: string, message: string) {
  return provider() === 'evolution' ? sendTextEvolution(phone, message) : sendTextZapi(phone, message)
}

async function sendTextEvolution(phone: string, message: string) {
  const baseUrl = env('EVOLUTION_URL').replace(/\/+$/, '')
  const response = await fetch(
    `${baseUrl}/message/sendText/${encodeURIComponent(env('EVOLUTION_INSTANCE'))}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env('EVOLUTION_API_KEY') },
      body: JSON.stringify({ number: toWhatsappNumber(phone), text: message }),
      // se a VPS estiver fora do ar, falha rápido em vez de travar a função
      signal: AbortSignal.timeout(15_000),
    }
  )
  if (!response.ok) {
    // 400 com "exists": false = número sem WhatsApp; 401 = apikey errada; 404 = instância não existe
    throw new Error(`Evolution ${response.status}: ${await response.text()}`)
  }
}

async function sendTextZapi(phone: string, message: string) {
  const clientToken = env('ZAPI_CLIENT_TOKEN')
  const response = await fetch(
    `https://api.z-api.io/instances/${env('ZAPI_INSTANCE_ID')}/token/${env('ZAPI_TOKEN')}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientToken ? { 'Client-Token': clientToken } : {}),
      },
      body: JSON.stringify({ phone: toWhatsappNumber(phone), message }),
    }
  )
  if (!response.ok) {
    // diz se o Client-Token foi enviado (só o tamanho, nunca o valor)
    const sent = clientToken
      ? `Client-Token enviado (${clientToken.length} caracteres)`
      : 'Client-Token NÃO enviado: secret ZAPI_CLIENT_TOKEN vazio ou ausente'
    throw new Error(`Z-API ${response.status}: ${await response.text()} | ${sent}`)
  }
}

function buildMessage(
  event: Event,
  audience: Audience,
  data: AppointmentRow,
  servicesText: string,
  body: RequestBody
) {
  const details = [
    `📅 Data: ${formatDate(data.date)}`,
    `🕐 Horário: ${data.time}`,
    `🚗 Serviços: ${servicesText}`,
    data.vehicle_type ? `🚙 Veículo: ${VEHICLE_LABELS[data.vehicle_type] ?? data.vehicle_type}` : null,
    `💰 Valor previsto: ${formatTotal(data.total)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const note = body.note?.trim() ? `\n\n💬 ${body.note.trim()}` : ''
  const hello = `Olá, ${data.client_name}!`

  if (event === 'novo' && audience === 'dono') {
    return (
      `🔔 *Novo agendamento no site*\n\n` +
      `👤 Cliente: ${data.client_name}\n` +
      `📱 WhatsApp: ${data.client_phone}\n` +
      `${details}\n\n` +
      `Confirme pelo painel admin para o cliente receber a confirmação.`
    )
  }

  if (event === 'novo') {
    return (
      `${hello} 👋\n` +
      `Recebemos seu agendamento na *${BUSINESS_NAME}*.\n\n` +
      `${details}\n\n` +
      `⏳ Agora é só aguardar: você recebe outra mensagem aqui assim que confirmarmos.`
    )
  }

  if (event === 'alterado' || event === 'reagendado') {
    const prev = body.previous ?? {}
    const changes = [
      prev.services ? `• Serviços: antes _${prev.services}_, agora *${servicesText}*` : null,
      prev.date && prev.time
        ? `• Horário: antes _${formatDate(prev.date)} às ${prev.time}_, agora *${formatDate(data.date)} às ${data.time}*`
        : null,
    ].filter(Boolean)
    const scheduleOnly = !prev.services
    return (
      `${hello} ✏️\n` +
      `Seu agendamento na *${BUSINESS_NAME}* foi ${scheduleOnly ? '*remarcado*' : '*alterado*'}.\n\n` +
      (changes.length ? `*O que mudou:*\n${changes.join('\n')}\n\n` : '') +
      `*Como ficou:*\n${details}` +
      note +
      `\n\nSe algo não estiver bom para você, é só responder aqui.`
    )
  }

  if (event === 'cancelado') {
    return (
      `${hello}\n` +
      `Seu agendamento na *${BUSINESS_NAME}* de ${formatDate(data.date)} às ${data.time} foi *cancelado*.` +
      note +
      `\n\nQuer marcar outro dia? É só responder aqui ou agendar pelo site.`
    )
  }

  return (
    `${hello} ✅\n` +
    `Seu agendamento na *${BUSINESS_NAME}* foi confirmado.\n\n` +
    `${details}` +
    note +
    `\n\nQualquer dúvida é só responder aqui. Até breve!`
  )
}

// Quem está chamando: o banco (trigger) ou um administrador logado no painel.
// deno-lint-ignore no-explicit-any
async function isAdminRequest(req: Request, supabase: any): Promise<boolean> {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return false
  const { data: userData } = await supabase.auth.getUser(jwt)
  const userId = userData?.user?.id
  if (!userId) return false
  const { data } = await supabase.from('admins').select('id').eq('id', userId).maybeSingle()
  return Boolean(data)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const missing = REQUIRED_SECRETS[provider()].filter((name) => !env(name))
  if (missing.length > 0) {
    const label = provider() === 'evolution' ? 'Evolution API' : 'Z-API'
    return json({ error: `${label} não configurado`, missing }, 500)
  }

  try {
    const body = (await req.json()) as RequestBody
    const { id, event = 'confirmado' } = body
    if (!id) return json({ error: 'id ausente' }, 400)
    if (!TRIGGER_EVENTS.includes(event) && !ADMIN_EVENTS.includes(event)) {
      return json({ error: 'evento inválido' }, 400)
    }

    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
    const webhookSecret = env('WEBHOOK_SECRET')
    const fromTrigger = !webhookSecret || req.headers.get('x-webhook-secret') === webhookSecret
    const fromAdmin = await isAdminRequest(req, supabase)

    // Remarcar/cancelar e recados só pelo painel, com login de administrador.
    if (ADMIN_EVENTS.includes(event) || body.note) {
      if (!fromAdmin) return json({ error: 'não autorizado' }, 401)
    } else if (!fromTrigger && !fromAdmin) {
      return json({ error: 'não autorizado' }, 401)
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('id, client_name, client_phone, vehicle_type, date, time, total, status, service_ids')
      .eq('id', id)
      .maybeSingle<AppointmentRow>()

    if (error || !data) return json({ error: 'agendamento não encontrado' }, 404)
    if (event === 'confirmado' && data.status !== 'confirmado') {
      return json({ skipped: true, reason: 'status não é confirmado' })
    }

    let servicesText = 'serviço'
    if (Array.isArray(data.service_ids) && data.service_ids.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('title')
        .in('id', data.service_ids)
      if (services && services.length > 0) {
        servicesText = services.map((service: { title: string }) => service.title).join(', ')
      }
    }

    // novo: cliente recebe "recebemos" e o dono recebe o aviso; demais: só o cliente.
    // O aviso do dono só sai com OWNER_WHATSAPP cadastrado e nunca para o número do
    // próprio cliente (assim o cliente não recebe "Novo agendamento").
    const targets: { audience: Audience; phone: string }[] = [
      { audience: 'cliente', phone: data.client_phone },
    ]
    const owner = env('OWNER_WHATSAPP')
    let ownerSkipped: string | undefined
    if (event === 'novo') {
      if (!owner) ownerSkipped = 'OWNER_WHATSAPP não cadastrado'
      else if (toWhatsappNumber(owner) === toWhatsappNumber(data.client_phone)) {
        ownerSkipped = 'cliente usa o mesmo número do dono'
      } else targets.push({ audience: 'dono', phone: owner })
    }

    const results = await Promise.allSettled(
      targets.map(({ audience, phone }) => {
        console.log(
          `[send-whatsapp] enviando "${event}" para ${audience} ...${toWhatsappNumber(phone).slice(-4)}`
        )
        return sendText(phone, buildMessage(event, audience, data, servicesText, body))
      })
    )
    const sent = Object.fromEntries(
      targets.map(({ audience }, i) => {
        const result = results[i]
        return [audience, result.status === 'fulfilled' ? 'ok' : String(result.reason)]
      })
    )
    if (results.every((r) => r.status === 'rejected')) {
      return json({ error: 'falha ao enviar', sent }, 502)
    }

    return json({ ok: true, event, provider: provider(), sent, ...(ownerSkipped ? { ownerSkipped } : {}) })
  } catch (err) {
    return json({ error: 'falha ao enviar', detail: String(err) }, 502)
  }
})
