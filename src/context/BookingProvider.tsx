import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { BookingContext } from './booking-context'
import type { BookingState } from './booking-context'
import type { VehicleType } from '../data/vehicles'

const STORAGE_KEY = 'azero-clean:booking'

const EMPTY_STATE: BookingState = {
  vehicleType: 'carro',
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
    // descarta datas que já passaram (estado salvo de uma visita anterior)
    const todayIso = format(new Date(), 'yyyy-MM-dd')
    const date =
      typeof parsed.date === 'string' && parsed.date >= todayIso ? parsed.date : null
    return {
      vehicleType:
        parsed.vehicleType && VEHICLE_TYPES.includes(parsed.vehicleType)
          ? parsed.vehicleType
          : EMPTY_STATE.vehicleType,
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
      date,
      time: date && typeof parsed.time === 'string' ? parsed.time : null,
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
