import { useEffect, useState } from 'react'
import { fetchServiceById } from '../lib/services'
import type { Service } from '../data/services'

export function useService(id: string | undefined) {
  const [result, setResult] = useState<{ id?: string; service: Service | null }>({
    service: null,
  })

  useEffect(() => {
    if (!id) return

    let active = true

    fetchServiceById(id).then((data) => {
      if (active) setResult({ id, service: data })
    })

    return () => {
      active = false
    }
  }, [id])

  const loading = Boolean(id) && result.id !== id

  return { service: loading ? null : result.service, loading }
}
