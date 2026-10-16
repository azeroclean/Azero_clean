import { services as fallbackServices, formatPrice } from '../data/services'
import type { Service } from '../data/services'
import type { VehicleType } from '../data/vehicles'

const FALLBACK_IMAGE = '/images/hero.png'

export interface NewAppointment {
  client_name: string
  client_phone: string
  client_email?: string | null
  vehicle_type: VehicleType
  vehicle_make: string
  vehicle_model: string
  vehicle_plate?: string | null
  service_ids: string[]
  date: string
  time: string
  notes?: string | null
  total: number
}

interface ServiceRow {
  id: string
  title: string
  description: string | null
  duration: string | null
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

function mapRow(row: ServiceRow): Service {
  const price = Number(row.price ?? 0)
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    duration: row.duration ?? '',
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

export async function fetchBookedSlots(date: string): Promise<string[]> {
  if (!isConfigured()) return []

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from('appointments')
      .select('time')
      .eq('date', date)
      .neq('status', 'cancelado')

    if (error || !data) return []

    return [...new Set((data as { time: string }[]).map((row) => row.time))]
  } catch {
    return []
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
