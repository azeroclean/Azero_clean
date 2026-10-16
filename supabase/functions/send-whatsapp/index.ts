// Edge Function: envia WhatsApp ao confirmar um agendamento.
// Deploy: supabase functions deploy send-whatsapp --project-ref <ref>
// Secrets:
//   EVOLUTION_API_URL   ex: https://sua-evolution.com
//   EVOLUTION_API_KEY   a API key (apikey global)
//   EVOLUTION_INSTANCE  nome da instância conectada via QR (ex: azero)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'azero'
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
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_KEY,
        },
        body: JSON.stringify({
          number: toWhatsappNumber(data.client_phone),
          text,
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
