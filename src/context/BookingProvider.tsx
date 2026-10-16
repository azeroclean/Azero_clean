import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BookingContext } from './booking-context'
import type { BookingState } from './booking-context'
import type { VehicleType } from '../data/vehicles'

const STORAGE_KEY = 'azero-clean:booking'

const EMPTY_STATE: BookingState = {
  vehicleType: null,
  selectedIds: [],
  date: null,
  time: null,
}

const VEHICLE_TYPES: VehicleType[] = ['moto', 'carro', 'caminhonete']

function readStoredState(): BookingState {
  if (typeof window === 'undefined') return EMPTY_STATE

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STATE

    const parsed = JSON.parse(raw) as Partial<BookingState>
    return {
      vehicleType:
        parsed.vehicleType && VEHICLE_TYPES.includes(parsed.vehicleType)
          ? parsed.vehicleType
          : null,
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
      date: typeof parsed.date === 'string' ? parsed.date : null,
      time: typeof parsed.time === 'string' ? parsed.time : null,
    }
  } catch {
    return EMPTY_STATE
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(readStoredState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // silencioso: persistência é opcional
    }
  }, [state])

  const setVehicleType = useCallback((vehicleType: VehicleType | null) => {
    setState((prev) => ({ ...prev, vehicleType }))
  }, [])

  const toggleService = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter((item) => item !== id)
        : [...prev.selectedIds, id],
    }))
  }, [])

  const setDate = useCallback((date: string | null) => {
    setState((prev) => ({ ...prev, date }))
  }, [])

  const setTime = useCallback((time: string | null) => {
    setState((prev) => ({ ...prev, time }))
  }, [])

  const reset = useCallback(() => setState(EMPTY_STATE), [])

  const value = useMemo(
    () => ({
      ...state,
      setVehicleType,
      toggleService,
      isSelected: (id: string) => state.selectedIds.includes(id),
      setDate,
      setTime,
      reset,
    }),
    [state, setVehicleType, toggleService, setDate, setTime, reset]
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}
