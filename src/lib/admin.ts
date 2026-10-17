import type { Session } from '@supabase/supabase-js'
import type { Appointment } from '../types/database'
import { VEHICLE_TYPES } from '../data/vehicles'
import type { VehicleType } from '../data/vehicles'
import { formatDuration } from '../data/services'
import { mapHoursRow } from './services'
import type { BusinessHoursRow } from './services'
import { DEFAULT_HOURS } from './schedule'
import type { WeekHours } from './schedule'

export type AppointmentStatus = Appointment['status']

export interface AdminAppointment {
  id: string
  client: string
  service: string
  date: string
  time: string
  status: AppointmentStatus
  vehicle: string
  phone: string
  total: number
  serviceIds: string[]
  vehicleType: VehicleType | null
}

type AppointmentRow = Pick<
  Appointment,
  | 'id'
  | 'client_name'
  | 'client_phone'
  | 'vehicle_type'
  | 'vehicle_make'
  | 'vehicle_model'
  | 'service_ids'
  | 'date'
  | 'time'
  | 'status'
> & { total: number | string | null }

export const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// Importa o client só quando há configuração: createClient falha com URL vazia.
async function getClient() {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')
  const { supabase } = await import('./supabase')
  return supabase
}

export async function getSession(): Promise<Session | null> {
  const supabase = await getClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function onAuthChange(callback: (session: Session | null) => void) {
  const supabase = await getClient()
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = await getClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message
    )
  }
}

export async function signOut(): Promise<void> {
  const supabase = await getClient()
  await supabase.auth.signOut()
}

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await getClient()
  const { data, error } = await supabase.rpc('is_admin')
  if (error) throw new Error(`Não foi possível verificar o acesso: ${error.message}`)
  return data === true
}

const vehicleLabel = (row: AppointmentRow) => {
  const name = [row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ').trim()
  if (name) return name
  return VEHICLE_TYPES.find((v) => v.value === row.vehicle_type)?.label ?? 'Veículo'
}

export async function fetchAdminAppointments(): Promise<AdminAppointment[]> {
  const supabase = await getClient()
  const [appointmentsRes, servicesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        'id, client_name, client_phone, vehicle_type, vehicle_make, vehicle_model, service_ids, date, time, status, total'
      )
      .order('date', { ascending: true })
      .order('time', { ascending: true }),
    supabase.from('services').select('id, title'),
  ])

  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message)
  if (servicesRes.error) throw new Error(servicesRes.error.message)

  const serviceNames = new Map(
    (servicesRes.data as { id: string; title: string }[]).map((s) => [s.id, s.title])
  )

  return (appointmentsRes.data as AppointmentRow[]).map((row) => ({
    id: row.id,
    client: row.client_name,
    phone: row.client_phone,
    service:
      (row.service_ids ?? []).map((id) => serviceNames.get(id) ?? 'Serviço removido').join(', ') ||
      'Sem serviço',
    vehicle: vehicleLabel(row),
    date: row.date,
    time: row.time,
    status: row.status,
    total: Number(row.total ?? 0),
    serviceIds: row.service_ids ?? [],
    vehicleType: (row.vehicle_type as VehicleType | null) ?? null,
  }))
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  // Sem a política appointments_admin_all o RLS bloqueia o update sem erro.
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para alterar. Rode supabase/admin-policies.sql no Supabase.')
  }
}

export interface AppointmentChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  id: string
  status?: AppointmentStatus
}

// Recebe na hora cada agendamento novo/alterado (Supabase Realtime).
// `onLive` diz se a conexão em tempo real está ativa; sem ela o painel atualiza sozinho de tempos em tempos.
export async function subscribeAppointments(
  onChange: (change: AppointmentChange) => void,
  onLive: (live: boolean) => void
): Promise<() => void> {
  const supabase = await getClient()
  const channel = supabase
    .channel('admin-appointments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
      const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as {
        id?: string
        status?: AppointmentStatus
      }
      if (!row?.id) return
      onChange({ type: payload.eventType, id: row.id, status: row.status })
    })
    .subscribe((status) => onLive(status === 'SUBSCRIBED'))

  return () => {
    supabase.removeChannel(channel)
  }
}

// Agendamentos do dia (exceto um), para calcular os horários livres ao remarcar.
export async function fetchDayBookings(
  date: string,
  exceptId: string
): Promise<{ time: string; service_ids: string[] }[]> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('id, time, service_ids')
    .eq('date', date)
    .neq('status', 'cancelado')
    .neq('id', exceptId)
  if (error) throw new Error(error.message)
  return (data as { time: string; service_ids: string[] | null }[]).map((row) => ({
    time: row.time,
    service_ids: row.service_ids ?? [],
  }))
}

export interface AppointmentChanges {
  date: string
  time: string
  service_ids: string[]
  total: number
}

export async function updateAppointment(id: string, changes: AppointmentChanges): Promise<void> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('appointments')
    .update(changes)
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para alterar. Rode supabase/admin-policies.sql no Supabase.')
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = await getClient()
  const { data, error } = await supabase.from('appointments').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para excluir. Rode supabase/admin-policies.sql no Supabase.')
  }
}

export type ClientNotice =
  | {
      event: 'alterado'
      // o que era antes; só vai o que mudou
      previous: { date?: string; time?: string; services?: string }
      note?: string
    }
  | { event: 'cancelado'; note?: string }

// Manda WhatsApp para o cliente pela Edge Function (Evolution API ou Z-API), com o login do admin.
export async function notifyClient(id: string, notice: ClientNotice): Promise<void> {
  const supabase = await getClient()
  const { data, error } = await supabase.functions.invoke('send-whatsapp', {
    body: { id, ...notice },
  })
  if (error) {
    let detail = error.message
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) detail = body.missing ? `${body.error}: ${body.missing.join(', ')}` : body.error
    } catch {
      // mantém a mensagem padrão
    }
    throw new Error(`Não foi possível enviar o WhatsApp (${detail}).`)
  }
  if (data?.sent?.cliente && data.sent.cliente !== 'ok') {
    throw new Error('O WhatsApp recusou a mensagem. Veja os logs da função send-whatsapp.')
  }
}

// ------------------------------------------------------------
// Serviços
// ------------------------------------------------------------

export interface AdminService {
  id: string
  title: string
  description: string
  category: string
  durationMinutes: number | null
  price: number
  priceMoto: number | null
  priceCarro: number | null
  priceCaminhonete: number | null
  imageUrl: string
  benefits: string[]
  active: boolean
}

export type ServiceInput = Omit<AdminService, 'id'>

interface AdminServiceRow {
  id: string
  title: string
  description: string | null
  category: string | null
  duration_minutes: number | null
  price: number | string | null
  price_moto: number | string | null
  price_carro: number | string | null
  price_caminhonete: number | string | null
  image_url: string | null
  benefits: string[] | null
  active: boolean
}

const numOrNull = (value: number | string | null) =>
  value === null || value === '' ? null : Number(value)

export async function fetchAdminServices(): Promise<AdminService[]> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('services')
    .select(
      'id, title, description, category, duration_minutes, price, price_moto, price_carro, price_caminhonete, image_url, benefits, active'
    )
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return (data as AdminServiceRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? '',
    durationMinutes: row.duration_minutes,
    price: Number(row.price ?? 0),
    priceMoto: numOrNull(row.price_moto),
    priceCarro: numOrNull(row.price_carro),
    priceCaminhonete: numOrNull(row.price_caminhonete),
    imageUrl: row.image_url ?? '',
    benefits: row.benefits ?? [],
    active: row.active,
  }))
}

export async function saveService(input: ServiceInput, id?: string): Promise<void> {
  const supabase = await getClient()
  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    duration_minutes: input.durationMinutes,
    duration: input.durationMinutes ? formatDuration(input.durationMinutes) : '',
    price: input.price,
    // o rótulo é recalculado a partir do preço
    price_label: null,
    price_moto: input.priceMoto,
    price_carro: input.priceCarro,
    price_caminhonete: input.priceCaminhonete,
    image_url: input.imageUrl.trim(),
    benefits: input.benefits,
    active: input.active,
  }

  const query = id
    ? supabase.from('services').update(row).eq('id', id).select('id')
    : supabase.from('services').insert(row).select('id')
  const { data, error } = await query

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para salvar. Rode supabase/agenda-servicos.sql no Supabase.')
  }
}

// ------------------------------------------------------------
// Horários disponíveis
// ------------------------------------------------------------

// O dono informa só o expediente; os horários de 30 em 30 min são gerados pelo site.
export async function fetchAdminBusinessHours(): Promise<WeekHours> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('business_hours')
    .select('weekday, is_open, open_time, close_time, break_start, break_end')

  if (error) {
    throw new Error(
      error.code === '42P01' || error.message.includes('business_hours')
        ? 'A tabela de horário de funcionamento ainda não existe. Rode supabase/horarios-funcionamento.sql no Supabase.'
        : error.message
    )
  }

  const week: WeekHours = { ...DEFAULT_HOURS }
  for (const row of data as BusinessHoursRow[]) week[row.weekday] = mapHoursRow(row)
  return week
}

export async function saveBusinessHours(week: WeekHours): Promise<void> {
  const rows = Object.entries(week).map(([weekday, day]) => ({
    weekday: Number(weekday),
    is_open: day.isOpen,
    open_time: day.open,
    close_time: day.close,
    break_start: day.breakStart,
    break_end: day.breakEnd,
    updated_at: new Date().toISOString(),
  }))
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('business_hours')
    .upsert(rows, { onConflict: 'weekday' })
    .select('weekday')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para salvar. Rode supabase/horarios-funcionamento.sql no Supabase.')
  }
}

// ------------------------------------------------------------
// Fotos dos serviços (Supabase Storage)
// ------------------------------------------------------------

const IMAGE_BUCKET = 'service-images'
const MAX_IMAGE_SIDE = 1600

// Reduz a foto (celulares geram arquivos de vários MB) e converte para WebP.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  return blob ?? file
}

export async function uploadServiceImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')

  const supabase = await getClient()
  const blob = await compressImage(file)
  const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'jpg')
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' })

  if (error) {
    throw new Error(
      /bucket not found/i.test(error.message)
        ? 'O local das fotos ainda não existe. Rode supabase/imagens-servicos.sql no Supabase.'
        : /row-level security|unauthorized/i.test(error.message)
          ? 'Sem permissão para enviar fotos. Rode supabase/imagens-servicos.sql no Supabase.'
          : error.message
    )
  }

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

// Apaga uma foto antiga do bucket (só se ela foi enviada pelo painel).
export async function removeServiceImage(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return
  try {
    const supabase = await getClient()
    await supabase.storage.from(IMAGE_BUCKET).remove([url.slice(index + marker.length)])
  } catch {
    // não impede salvar o serviço
  }
}
