import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Check,
  X,
  Car,
  ExternalLink,
  Search,
  MessageCircle,
  ChevronRight,
  Inbox,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Package,
  CalendarClock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AdminBrand,
  AdminNotice,
  AdminScreen,
  AdminSpinner,
  SupabaseNotConfigured,
  adminButton,
} from '../components/AdminScreen'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { ServicesManager } from './admin/ServicesManager'
import { TimeSlotsManager } from './admin/TimeSlotsManager'
import { fetchAdminAppointments, signOut, updateAppointmentStatus } from '../lib/admin'
import type { AdminAppointment, AppointmentStatus as Status } from '../lib/admin'

type Tab = 'dashboard' | 'agendamentos' | 'servicos' | 'horarios' | 'clientes' | 'veiculos'
type StatusHandler = (id: string, s: Status) => void

const NAV: { id: Tab; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Início', short: 'Início', icon: LayoutDashboard },
  { id: 'agendamentos', label: 'Agendamentos', short: 'Agenda', icon: Calendar },
  { id: 'servicos', label: 'Serviços', short: 'Serviços', icon: Package },
  { id: 'horarios', label: 'Horários disponíveis', short: 'Horários', icon: CalendarClock },
  { id: 'clientes', label: 'Clientes', short: 'Clientes', icon: Users },
  { id: 'veiculos', label: 'Veículos', short: 'Veículos', icon: Car },
]

// Abas que mostram os agendamentos (as outras carregam os próprios dados)
const APPOINTMENT_TABS: Tab[] = ['dashboard', 'agendamentos', 'clientes', 'veiculos']

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmado: { label: 'Confirmado', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  concluido: { label: 'Concluído', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-600 ring-red-200' },
}

const FILTERS: ('todos' | Status)[] = ['todos', 'pendente', 'confirmado', 'concluido', 'cancelado']

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const shortDate = (iso: string) =>
  format(new Date(`${iso}T00:00:00`), "dd 'de' MMM", { locale: ptBR }).replace('.', '')

const waLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, '')}`

export function Admin() {
  const auth = useAdminAuth()

  if (auth.status === 'ready') return <AdminPanel email={auth.email} />
  if (auth.status === 'signedOut' || auth.status === 'notAdmin') {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <AdminScreen>
      <AdminBrand />
      {auth.status === 'unconfigured' && <SupabaseNotConfigured />}
      {auth.status === 'loading' && <AdminSpinner label="Verificando acesso..." />}
      {auth.status === 'error' && (
        <AdminNotice
          icon={AlertTriangle}
          tone="danger"
          title="Erro ao conectar"
          action={<RetryButton onClick={() => window.location.reload()} />}
        >
          {auth.message}
        </AdminNotice>
      )}
    </AdminScreen>
  )
}

function AdminPanel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [filter, setFilter] = useState<'todos' | Status>('todos')
  const [query, setQuery] = useState('')
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [now] = useState(() => new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setAppointments(await fetchAdminAppointments())
    } catch (error) {
      setLoadError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Primeira carga: o estado inicial já é "carregando", então só grava o resultado.
  useEffect(() => {
    let cancelled = false
    fetchAdminAppointments()
      .then((data) => !cancelled && setAppointments(data))
      .catch((error: Error) => !cancelled && setLoadError(error.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const setStatus: StatusHandler = async (id, status) => {
    setBusyId(id)
    setActionError(null)
    try {
      await updateAppointmentStatus(id, status)
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    } catch (error) {
      setActionError((error as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [appointments]
  )

  const todayIso = format(now, 'yyyy-MM-dd')
  const monthIso = todayIso.slice(0, 7)

  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.status !== 'cancelado')
    const today = active.filter((a) => a.date === todayIso).length
    const revenue = active
      .filter((a) => a.date.startsWith(monthIso))
      .reduce((acc, a) => acc + a.total, 0)
    const clients = new Set(appointments.map((a) => a.phone)).size
    const pending = appointments.filter((a) => a.status === 'pendente').length
    return [
      { label: 'Agendamentos hoje', value: String(today), icon: Calendar },
      { label: 'Receita prevista no mês', value: money(revenue), icon: DollarSign },
      { label: 'Clientes', value: String(clients), icon: Users },
      { label: 'Aguardando confirmação', value: String(pending), icon: TrendingUp },
    ]
  }, [appointments, todayIso, monthIso])

  const upcoming = sorted.filter(
    (a) => a.date >= todayIso && (a.status === 'pendente' || a.status === 'confirmado')
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter(
      (a) =>
        (filter === 'todos' || a.status === filter) &&
        (!q || `${a.client} ${a.phone} ${a.service} ${a.vehicle}`.toLowerCase().includes(q))
    )
  }, [sorted, filter, query])

  const clients = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; vehicles: Set<string>; visits: number; last: string }>()
    for (const a of sorted) {
      const entry = map.get(a.phone) ?? { name: a.client, phone: a.phone, vehicles: new Set(), visits: 0, last: a.date }
      entry.vehicles.add(a.vehicle)
      if (a.status !== 'cancelado') entry.visits += 1
      entry.last = a.date
      map.set(a.phone, entry)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [sorted])

  const vehicles = useMemo(() => {
    const map = new Map<string, { name: string; owner: string; services: number }>()
    for (const a of appointments) {
      const key = `${a.vehicle}|${a.phone}`
      const entry = map.get(key) ?? { name: a.vehicle, owner: a.client, services: 0 }
      if (a.status !== 'cancelado') entry.services += 1
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [appointments])

  const showAppointments = APPOINTMENT_TABS.includes(tab)
  const ready = showAppointments && !loadError && !(loading && appointments.length === 0)
  const pendingCount = appointments.filter((a) => a.status === 'pendente').length
  const current = NAV.find((n) => n.id === tab)!

  return (
    <div className="min-h-screen bg-bg text-text lg:flex">
      {/* Barra lateral — computador */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-ink text-white'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.id === 'agendamentos' && pendingCount > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <Link
          to="/"
          className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-surface-2 hover:text-text"
        >
          <ExternalLink className="h-4 w-4" />
          Ver site
        </Link>
        <div className="mt-2 border-t border-border pt-3">
          <p className="truncate px-3 text-[11px] text-text-tertiary" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-5">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <div>
                <h1 className="text-base font-bold lg:text-xl">{current.label}</h1>
                <p className="hidden text-xs text-text-secondary first-letter:uppercase lg:block">
                  {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {APPOINTMENT_TABS.includes(tab) && (
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:text-text disabled:opacity-60"
                  aria-label="Atualizar agendamentos"
                  title="Atualizar"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              <Link
                to="/"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:text-text lg:hidden"
                aria-label="Ver site"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:bg-red-50 hover:text-red-600 lg:hidden"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-6">
          {actionError && (
            <div
              className="mb-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1">Não foi possível alterar o status. {actionError}</p>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="shrink-0 text-red-600 hover:text-red-800"
                aria-label="Fechar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {showAppointments && loading && appointments.length === 0 && <AdminSpinner label="Carregando agendamentos..." />}

          {showAppointments && loadError && (
            <div className="mx-auto max-w-md py-6">
              <AdminNotice
                icon={AlertTriangle}
                tone="danger"
                title="Erro ao carregar agendamentos"
                action={<RetryButton onClick={load} />}
              >
                {loadError}
              </AdminNotice>
            </div>
          )}

          {ready && tab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm lg:p-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-600">
                      <stat.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold lg:text-2xl">{stat.value}</p>
                      <p className="text-xs text-text-secondary">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-5">
                <section className="flex flex-col gap-3 lg:col-span-3">
                  <SectionTitle
                    title="Próximos agendamentos"
                    action={{ label: 'Ver todos', onClick: () => setTab('agendamentos') }}
                  />
                  <AppointmentList items={upcoming.slice(0, 5)} onStatus={setStatus} busyId={busyId} />
                </section>

                <section className="flex flex-col gap-3 lg:col-span-2">
                  <SectionTitle title="Por status" />
                  <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm">
                    {(Object.keys(STATUS_STYLE) as Status[]).map((status) => {
                      const count = appointments.filter((a) => a.status === status).length
                      const pct = appointments.length ? (count / appointments.length) * 100 : 0
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setFilter(status)
                            setTab('agendamentos')
                          }}
                          className="flex flex-col gap-1.5 rounded-xl p-2 text-left transition hover:bg-surface-2"
                        >
                          <span className="flex items-center justify-between text-sm">
                            <StatusPill status={status} />
                            <span className="font-semibold">{count}</span>
                          </span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {ready && tab === 'agendamentos' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
                  {FILTERS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilter(status)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                        filter === status
                          ? 'bg-ink text-white'
                          : 'bg-surface text-text-secondary shadow-sm hover:text-text'
                      }`}
                    >
                      {status === 'todos' ? 'Todos' : STATUS_STYLE[status].label}
                    </button>
                  ))}
                </div>
                <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente, serviço..." />
              </div>

              {/* Celular: cards */}
              <div className="lg:hidden">
                <AppointmentList items={filtered} onStatus={setStatus} busyId={busyId} />
              </div>

              {/* Computador: tabela */}
              <div className="hidden overflow-hidden rounded-2xl bg-surface shadow-sm lg:block">
                {filtered.length === 0 ? (
                  <Empty />
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs text-text-secondary">
                      <tr>
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <th className="px-5 py-3 font-medium">Serviço</th>
                        <th className="px-5 py-3 font-medium">Veículo</th>
                        <th className="px-5 py-3 font-medium">Data</th>
                        <th className="px-5 py-3 font-medium">Valor</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 text-right font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((apt) => (
                        <tr key={apt.id} className="border-b border-border/60 last:border-0 hover:bg-bg">
                          <td className="px-5 py-3">
                            <p className="font-semibold">{apt.client}</p>
                            <p className="text-xs text-text-tertiary">{apt.phone}</p>
                          </td>
                          <td className="px-5 py-3 text-text-secondary">{apt.service}</td>
                          <td className="px-5 py-3 text-text-secondary">{apt.vehicle}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                            {shortDate(apt.date)} · {apt.time}
                          </td>
                          <td className="px-5 py-3 font-medium">{money(apt.total)}</td>
                          <td className="px-5 py-3">
                            <StatusPill status={apt.status} />
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end">
                              <Actions apt={apt} onStatus={setStatus} busyId={busyId} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tab === 'servicos' && <ServicesManager />}

          {tab === 'horarios' && <TimeSlotsManager />}

          {ready && tab === 'clientes' && clients.length === 0 && <Empty message="Nenhum cliente ainda." />}

          {ready && tab === 'clientes' && clients.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => (
                <div key={c.phone} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                    {c.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-text-tertiary">{c.phone}</p>
                    <p className="mt-1 truncate text-xs text-text-secondary">
                      {c.visits} {c.visits === 1 ? 'visita' : 'visitas'} · {[...c.vehicles].join(', ')}
                    </p>
                  </div>
                  <a
                    href={waLink(c.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-600 transition hover:bg-primary/20"
                    aria-label={`WhatsApp de ${c.name}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {ready && tab === 'veiculos' && vehicles.length === 0 && <Empty message="Nenhum veículo ainda." />}

          {ready && tab === 'veiculos' && vehicles.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((v) => (
                <div key={`${v.name}-${v.owner}`} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lilac">
                    <Car className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.name}</p>
                    <p className="text-xs text-text-tertiary">{v.owner}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {v.services} {v.services === 1 ? 'serviço' : 'serviços'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Barra de abas — celular */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  active ? 'text-text' : 'text-text-tertiary'
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                    active ? 'bg-primary/15 text-primary-600' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                {item.short}
                {item.id === 'agendamentos' && pendingCount > 0 && (
                  <span className="absolute right-[22%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-black text-white">
        AC
      </span>
      {!compact && (
        <div>
          <p className="text-sm font-bold">Azero Clean</p>
          <p className="text-[11px] text-text-tertiary">Painel administrativo</p>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary-600"
        >
          {action.label}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block lg:w-72">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lilac" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border-2 border-transparent bg-surface py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-text-tertiary focus:border-primary/60 focus:outline-none"
      />
    </label>
  )
}

function StatusPill({ status }: { status: Status }) {
  const style = STATUS_STYLE[status]
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${style.className}`}>
      {style.label}
    </span>
  )
}

interface ActionProps {
  onStatus: StatusHandler
  busyId: string | null
}

function Actions({ apt, onStatus, busyId }: ActionProps & { apt: AdminAppointment }) {
  const busy = busyId === apt.id
  if (busy) {
    return (
      <span className="flex h-8 items-center px-3" role="status" aria-label="Salvando">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      </span>
    )
  }
  const disabled = busyId !== null
  if (apt.status === 'pendente') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onStatus(apt.id, 'confirmado')}
          disabled={disabled}
          className="flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => onStatus(apt.id, 'cancelado')}
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          aria-label="Cancelar agendamento"
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }
  if (apt.status === 'confirmado') {
    return (
      <button
        type="button"
        onClick={() => onStatus(apt.id, 'concluido')}
        disabled={disabled}
        className="flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white transition hover:bg-ink-2 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
        Concluir
      </button>
    )
  }
  return null
}

function AppointmentList({ items, onStatus, busyId }: ActionProps & { items: AdminAppointment[] }) {
  if (items.length === 0) return <Empty />
  return (
    <ul className="flex flex-col gap-3">
      {items.map((apt) => (
        <li key={apt.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{apt.client}</p>
              <p className="truncate text-xs text-text-secondary">
                {apt.service} · {apt.vehicle}
              </p>
            </div>
            <StatusPill status={apt.status} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Clock className="h-3.5 w-3.5 text-lilac" />
              {shortDate(apt.date)} · {apt.time}
              <span className="ml-1 font-semibold text-text">{money(apt.total)}</span>
            </span>
            <div className="flex items-center gap-2">
              <a
                href={waLink(apt.phone)}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:text-text"
                aria-label={`WhatsApp de ${apt.client}`}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <Actions apt={apt} onStatus={onStatus} busyId={busyId} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Empty({ message = 'Nenhum agendamento encontrado.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-10 text-center shadow-sm">
      <Inbox className="h-6 w-6 text-text-tertiary" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  )
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${adminButton} bg-ink text-white hover:bg-ink-2`}>
      <RefreshCw className="h-4 w-4" />
      Tentar novamente
    </button>
  )
}
