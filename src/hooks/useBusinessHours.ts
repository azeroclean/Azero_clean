import { useEffect, useState } from 'react'
import { fetchBusinessHours } from '../lib/services'
import { DEFAULT_HOURS } from '../lib/schedule'
import type { WeekHours } from '../lib/schedule'

// Expediente da semana. Começa com o padrão do site e troca pelo do banco quando chegar.
export function useBusinessHours() {
  const [state, setState] = useState<{ hours: WeekHours; loading: boolean }>({
    hours: DEFAULT_HOURS,
    loading: true,
  })

  useEffect(() => {
    let active = true
    fetchBusinessHours().then((hours) => {
      if (active) setState({ hours: hours ?? DEFAULT_HOURS, loading: false })
    })
    return () => {
      active = false
    }
  }, [])

  return state
}
