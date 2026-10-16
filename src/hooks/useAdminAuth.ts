import { useEffect, useState } from 'react'
import { checkIsAdmin, getSession, isSupabaseConfigured, onAuthChange } from '../lib/admin'

export type AdminAuthState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'notAdmin'; email: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; email: string }

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>(() =>
    isSupabaseConfigured() ? { status: 'loading' } : { status: 'unconfigured' }
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const resolve = async (email: string | null) => {
      if (!email) {
        if (!cancelled) setState({ status: 'signedOut' })
        return
      }
      try {
        const admin = await checkIsAdmin()
        if (!cancelled) setState(admin ? { status: 'ready', email } : { status: 'notAdmin', email })
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: (error as Error).message })
      }
    }

    getSession()
      .then((session) => resolve(session?.user.email ?? null))
      .catch((error: Error) => !cancelled && setState({ status: 'error', message: error.message }))

    onAuthChange((session) => {
      // Evita chamar o banco dentro do callback do Supabase (pode travar o client).
      setTimeout(() => resolve(session?.user.email ?? null), 0)
    }).then((unsub) => {
      if (cancelled) unsub()
      else unsubscribe = unsub
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return state
}
