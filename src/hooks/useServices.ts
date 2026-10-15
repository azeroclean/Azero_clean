import { useEffect, useState } from 'react'
import { fetchServices } from '../lib/services'
import type { Service } from '../data/services'

export function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    fetchServices()
      .then((data) => {
        if (active) setServices(data)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { services, loading }
}
