export interface Service {
  id: string
  title: string
  description: string
  duration: string
  price: number
  price_label?: string
  category: string
  image_url: string
  benefits: string[]
  active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  client_name: string
  client_phone: string
  client_email?: string
  vehicle_make: string
  vehicle_model: string
  vehicle_plate?: string
  service_id: string
  date: string
  time: string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
  notes?: string
  total: number
  created_at: string
}

export interface Admin {
  id: string
  email: string
  name: string
  created_at: string
}
