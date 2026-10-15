import { createContext, useContext } from 'react'

export interface BookingState {
  selectedIds: string[]
  date: string | null
  time: string | null
}

export interface BookingContextValue extends BookingState {
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
