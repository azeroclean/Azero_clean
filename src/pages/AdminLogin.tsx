import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AlertTriangle, Loader2, Lock, ShieldX } from 'lucide-react'
import {
  AdminBrand,
  AdminNotice,
  AdminScreen,
  AdminSpinner,
  SupabaseNotConfigured,
  adminButton,
} from '../components/AdminScreen'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { signIn, signOut } from '../lib/admin'

const inputClass =
  'w-full rounded-xl border-2 border-transparent bg-surface-2 px-4 py-3 text-sm placeholder:text-text-tertiary focus:border-primary/60 focus:bg-surface focus:outline-none'

export function AdminLogin() {
  const auth = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === 'ready') return <Navigate to="/admin" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminScreen>
      <AdminBrand />

      {auth.status === 'unconfigured' && <SupabaseNotConfigured />}

      {auth.status === 'loading' && <AdminSpinner label="Verificando sessão..." />}

      {auth.status === 'error' && (
        <AdminNotice icon={AlertTriangle} tone="danger" title="Erro ao conectar">
          {auth.message}
        </AdminNotice>
      )}

      {auth.status === 'notAdmin' && (
        <AdminNotice
          icon={ShieldX}
          tone="danger"
          title="Acesso negado"
          action={
            <button
              type="button"
              onClick={() => signOut()}
              className={`${adminButton} bg-ink text-white hover:bg-ink-2`}
            >
              Sair e usar outra conta
            </button>
          }
        >
          A conta <strong className="text-text">{auth.email}</strong> não está cadastrada como
          administradora.
        </AdminNotice>
      )}

      {auth.status === 'signedOut' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-lilac" />
            <h1 className="text-base font-bold">Entrar</h1>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="admin@exemplo.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`${adminButton} mt-1 bg-primary text-white hover:bg-primary-600`}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>
      )}

      <Link to="/" className="mt-6 block text-center text-xs font-medium text-text-secondary hover:text-text">
        Voltar para o site
      </Link>
    </AdminScreen>
  )
}
