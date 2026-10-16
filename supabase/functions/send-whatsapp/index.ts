// Edge Function: envia WhatsApp ao confirmar um agendamento (Z-API).
// Deploy: supabase functions deploy send-whatsapp --project-ref <ref>
// Secrets:
//   ZAPI_INSTANCE_ID     ID da instância (painel Z-API)
//   ZAPI_TOKEN           token da instância
//   ZAPI_CLIENT_TOKEN    security token da conta (Client-Token)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? ''
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN') ?? ''
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface AppointmentRow {
  id: string
  client_name: string
  client_phone: string
  date: string
  time: string
  total: number
  status: string
  service_ids: string[] | null
}

function toWhatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const { id } = await req.json()
    if (!id) return json({ error: 'id ausente' }, 400)

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data, error } = await supabase
      .from('appointments')
      .select('id, client_name, client_phone, date, time, total, status, service_ids')
      .eq('id', id)
      .maybeSingle<AppointmentRow>()

    if (error || !data) return json({ error: 'agendamento não encontrado' }, 404)
    if (data.status !== 'confirmado') {
      return json({ skipped: true, reason: 'status não é confirmado' })
    }

    let servicesText = 'seu serviço'
    if (Array.isArray(data.service_ids) && data.service_ids.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('title')
        .in('id', data.service_ids)
      if (services && services.length > 0) {
        servicesText = services.map((service) => service.title).join(', ')
      }
    }

    const text =
      `Olá, ${data.client_name}! ✅\n` +
      `Seu agendamento na *Azero Clean* foi confirmado.\n\n` +
      `📅 Data: ${formatDate(data.date)}\n` +
      `🕐 Horário: ${data.time}\n` +
      `🚗 Serviços: ${servicesText}\n` +
      `💰 Valor previsto: R$ ${Number(data.total).toFixed(2)}\n\n` +
      `Qualquer dúvida é só responder aqui. Até breve!`

    const response = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({
          phone: toWhatsappNumber(data.client_phone),
          message: text,
        }),
      }
    )

    if (!response.ok) {
      const detail = await response.text()
      return json({ error: 'falha ao enviar', detail }, 502)
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
