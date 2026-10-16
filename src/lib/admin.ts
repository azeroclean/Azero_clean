import type { Session } from '@supabase/supabase-js'
import type { Appointment } from '../types/database'
import { VEHICLE_TYPES } from '../data/vehicles'
import { formatDuration } from '../data/services'

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

export interface TimeSlot {
  id: string
  weekday: number
  time: string
}

export async function fetchAdminTimeSlots(): Promise<TimeSlot[]> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('time_slots')
    .select('id, weekday, time')
    .order('weekday')
    .order('time')

  if (error) {
    throw new Error(
      error.code === '42P01' || error.message.includes('time_slots')
        ? 'A tabela de horários ainda não existe. Rode supabase/agenda-servicos.sql no Supabase.'
        : error.message
    )
  }
  return data as TimeSlot[]
}

export async function addTimeSlots(slots: { weekday: number; time: string }[]): Promise<void> {
  if (slots.length === 0) return
  const supabase = await getClient()
  const { error } = await supabase
    .from('time_slots')
    .upsert(slots, { onConflict: 'weekday,time', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export async function removeTimeSlot(id: string): Promise<void> {
  const supabase = await getClient()
  const { data, error } = await supabase.from('time_slots').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Sem permissão para remover este horário.')
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
