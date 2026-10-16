import type { Session } from '@supabase/supabase-js'
import type { Appointment } from '../types/database'
import { VEHICLE_TYPES } from '../data/vehicles'

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
