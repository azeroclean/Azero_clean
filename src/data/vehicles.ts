import { Bike, Car, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type VehicleType = 'moto' | 'carro' | 'caminhonete'

export interface VehicleOption {
  value: VehicleType
  label: string
  description: string
  icon: LucideIcon
}

export const VEHICLE_TYPES: VehicleOption[] = [
  {
    value: 'moto',
    label: 'Moto',
    description: 'Motocicletas e scooters',
    icon: Bike,
  },
  {
    value: 'carro',
    label: 'Carro',
    description: 'Hatch, sedan e SUV',
    icon: Car,
  },
  {
    value: 'caminhonete',
    label: 'Caminhonete',
    description: 'Picapes e utilitários',
    icon: Truck,
  },
]

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  moto: 'Moto',
  carro: 'Carro',
  caminhonete: 'Caminhonete',
}
