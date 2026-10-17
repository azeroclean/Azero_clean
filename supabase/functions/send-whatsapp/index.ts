// Edge Function: envia mensagens de WhatsApp pelo Z-API.
//
//   evento "novo"        -> avisa o dono que chegou um agendamento (status pendente)
//   evento "confirmado"  -> avisa o cliente que o agendamento foi confirmado
//
// Deploy: supabase functions deploy send-whatsapp --project-ref <ref>
// Secrets (Supabase > Edge Functions > Secrets, ou `supabase secrets set`):
//   ZAPI_INSTANCE_ID     ID da instância (painel Z-API)
//   ZAPI_TOKEN           token da instância
//   ZAPI_CLIENT_TOKEN    (opcional) security token da conta, só se a segurança estiver ativa no Z-API
//   OWNER_WHATSAPP       (opcional) número do dono com DDI, ex: 5588994987680
//   WEBHOOK_SECRET       (opcional) se definido, o trigger precisa enviar o mesmo valor
//                        no header x-webhook-secret (veja supabase/whatsapp-trigger.sql)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.
//
// Passo a passo completo: supabase/ZAPI-SETUP.md

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Lidos a cada chamada (e sem espaços), para valer na hora em que o secret muda.
const env = (name: string) => (Deno.env.get(name) ?? '').trim()
const OWNER_WHATSAPP = Deno.env.get('OWNER_WHATSAPP') ?? '5588994987680'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const BUSINESS_NAME = 'Azero Clean'

type Event = 'novo' | 'confirmado'

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
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendText(phone: string, message: string) {
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
    const sent = clientToken ? `Client-Token enviado (${clientToken.length} caracteres)` : 'Client-Token NÃO enviado: secret ZAPI_CLIENT_TOKEN vazio ou ausente'
    throw new Error(`Z-API ${response.status}: ${await response.text()} | ${sent}`)
  }
}

function buildMessage(event: Event, data: AppointmentRow, servicesText: string) {
  const details =
    `📅 Data: ${formatDate(data.date)}\n` +
    `🕐 Horário: ${data.time}\n` +
    `🚗 Serviços: ${servicesText}\n` +
    (data.vehicle_type ? `🚙 Veículo: ${VEHICLE_LABELS[data.vehicle_type] ?? data.vehicle_type}\n` : '') +
    `💰 Valor previsto: ${formatTotal(data.total)}`

  if (event === 'novo') {
    return (
      `🔔 *Novo agendamento no site*\n\n` +
      `👤 Cliente: ${data.client_name}\n` +
      `📱 WhatsApp: ${data.client_phone}\n` +
      `${details}\n\n` +
      `Confirme pelo painel admin para o cliente receber a confirmação.`
    )
  }

  return (
    `Olá, ${data.client_name}! ✅\n` +
    `Seu agendamento na *${BUSINESS_NAME}* foi confirmado.\n\n` +
    `${details}\n\n` +
    `Qualquer dúvida é só responder aqui. Até breve!`
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'não autorizado' }, 401)
  }

  const missing = [
    ['ZAPI_INSTANCE_ID', env('ZAPI_INSTANCE_ID')],
    ['ZAPI_TOKEN', env('ZAPI_TOKEN')],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    return json({ error: 'Z-API não configurado', missing }, 500)
  }

  try {
    const { id, event = 'confirmado' } = (await req.json()) as { id?: string; event?: Event }
    if (!id) return json({ error: 'id ausente' }, 400)
    if (event !== 'novo' && event !== 'confirmado') return json({ error: 'evento inválido' }, 400)

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

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
        servicesText = services.map((service) => service.title).join(', ')
      }
    }

    const to = event === 'novo' ? OWNER_WHATSAPP : data.client_phone
    console.log(`[send-whatsapp] enviando "${event}" para ...${toWhatsappNumber(to).slice(-4)}`)
    await sendText(to, buildMessage(event, data, servicesText))

    return json({ ok: true, event })
  } catch (err) {
    return json({ error: 'falha ao enviar', detail: String(err) }, 502)
  }
})
