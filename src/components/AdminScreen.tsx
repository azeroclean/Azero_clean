import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BUSINESS } from '../data/business'

// Tela centralizada usada no login e nos estados de carregando/erro do painel.
export function AdminScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-text">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

export function AdminBrand() {
  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      <img
        src={BUSINESS.logo}
        alt={`Logo ${BUSINESS.name}`}
        className="h-24 w-24 rounded-full bg-black object-cover shadow-md"
      />
      <div>
        <p className="text-base font-bold">Azero Clean</p>
        <p className="text-xs text-text-tertiary">Painel administrativo</p>
      </div>
    </div>
  )
}

export function AdminSpinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-text-secondary">{label}</p>
    </div>
  )
}

interface AdminNoticeProps {
  icon: LucideIcon
  tone?: 'neutral' | 'danger'
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function AdminNotice({ icon: Icon, tone = 'neutral', title, children, action }: AdminNoticeProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-sm">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-surface-2 text-lilac'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="text-xs leading-relaxed text-text-secondary">{children}</div>}
      {action}
    </div>
  )
}

export const adminButton =
  'flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-60'

export function SupabaseNotConfigured() {
  return (
    <AdminNotice icon={AlertTriangle} title="Supabase não configurado">
      Defina <code className="font-semibold text-text">VITE_SUPABASE_URL</code> e{' '}
      <code className="font-semibold text-text">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
      <code className="font-semibold text-text">.env</code> (veja <code>.env.example</code>) e reinicie o
      servidor para usar o painel.
    </AdminNotice>
  )
}
