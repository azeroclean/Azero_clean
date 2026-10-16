import { createContext, useContext } from 'react'
import type { VehicleType } from '../data/vehicles'

export interface BookingState {
  vehicleType: VehicleType | null
  selectedIds: string[]
  date: string | null
  time: string | null
}

export interface BookingContextValue extends BookingState {
  setVehicleType: (vehicleType: VehicleType | null) => void
  toggleService: (id: string) => void
  isSelected: (id: string) => boolean
  setDate: (date: string | null) => void
  setTime: (time: string | null) => void
  reset: () => void
}

export const BookingContext = createContext<BookingContextValue | null>(null)

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking deve ser usado dentro de BookingProvider')
  }
  return context
}
