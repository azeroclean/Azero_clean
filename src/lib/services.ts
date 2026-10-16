import { services as fallbackServices, formatDuration, formatPrice } from '../data/services'
import type { Service } from '../data/services'
import type { VehicleType } from '../data/vehicles'

const FALLBACK_IMAGE = '/images/hero.png'

export interface NewAppointment {
  client_name: string
  client_phone: string
  client_email?: string | null
  vehicle_type: VehicleType
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_plate?: string | null
  service_ids: string[]
  date: string
  time: string
  notes?: string | null
  total: number
}

export interface ServiceRow {
  id: string
  title: string
  description: string | null
  duration: string | null
  duration_minutes?: number | null
  price: number | string | null
  price_label: string | null
  price_moto: number | string | null
  price_carro: number | string | null
  price_caminhonete: number | string | null
  category: string | null
  image_url: string | null
  benefits: string[] | null
}

const isConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

async function getClient() {
  const { supabase } = await import('./supabase')
  return supabase
}

const toNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function mapRow(row: ServiceRow): Service {
  const price = Number(row.price ?? 0)
  const minutes = row.duration_minutes ?? undefined
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    duration: row.duration || (minutes ? formatDuration(minutes) : ''),
    durationMinutes: minutes,
    price,
    priceLabel: row.price_label ?? formatPrice(price),
    category: row.category ?? '',
    image: row.image_url || FALLBACK_IMAGE,
    benefits: row.benefits ?? [],
    prices: {
      moto: toNumber(row.price_moto),
      carro: toNumber(row.price_carro),
      caminhonete: toNumber(row.price_caminhonete),
    },
  }
}

export async function fetchServices(): Promise<Service[]> {
  if (!isConfigured()) return fallbackServices

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) return fallbackServices

    return (data as ServiceRow[]).map(mapRow)
  } catch {
    return fallbackServices
  }
}

export async function fetchServiceById(id: string): Promise<Service | null> {
  const fallback = fallbackServices.find((service) => service.id === id) ?? null

  if (!isConfigured()) return fallback

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) return fallback

    return mapRow(data as ServiceRow)
  } catch {
    return fallback
  }
}

export interface Booking {
  time: string
  service_ids: string[]
}

// Horários do dia já reservados (com os serviços, para calcular a duração).
export async function fetchBookings(date: string): Promise<Booking[]> {
  if (!isConfigured()) return []

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from('appointments')
      .select('time, service_ids')
      .eq('date', date)
      .neq('status', 'cancelado')

    if (error || !data) return []

    return (data as Booking[]).map((row) => ({ time: row.time, service_ids: row.service_ids ?? [] }))
  } catch {
    return []
  }
}

// Horários configurados pelo admin, por dia da semana (0 = domingo).
// null = usar os horários padrão do site (sem Supabase ou tabela ainda não criada/vazia).
export async function fetchTimeSlots(): Promise<Record<number, string[]> | null> {
  if (!isConfigured()) return null

  try {
    const supabase = await getClient()
    const { data, error } = await supabase.from('time_slots').select('weekday, time').order('time')

    if (error || !data || data.length === 0) return null

    const byDay: Record<number, string[]> = {}
    for (const row of data as { weekday: number; time: string }[]) {
      ;(byDay[row.weekday] ??= []).push(row.time)
    }
    return byDay
  } catch {
    return null
  }
}

export async function fetchClientNameByPhone(phone: string): Promise<string | null> {
  if (!isConfigured() || !phone.trim()) return null

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from('appointments')
      .select('client_name')
      .eq('client_phone', phone.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    return (data as { client_name: string }).client_name ?? null
  } catch {
    return null
  }
}

export async function createAppointment(payload: NewAppointment): Promise<void> {
  if (!isConfigured()) {
    throw new Error('Supabase não configurado')
  }

  const supabase = await getClient()
  const { error } = await supabase.from('appointments').insert(payload)

  if (error) throw error
}
