import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Car,
  LogOut,
} from 'lucide-react'

const mockAppointments = [
  {
    id: 1,
    client: 'João Silva',
    service: 'Lavagem Completa',
    date: '2026-10-17',
    time: '08:30',
    status: 'confirmado',
    vehicle: 'Honda Civic',
    phone: '(88) 99999-0001',
  },
  {
    id: 2,
    client: 'Maria Santos',
    service: 'Higienização Interna',
    date: '2026-10-17',
    time: '11:00',
    status: 'pendente',
    vehicle: 'Toyota Corolla',
    phone: '(88) 99999-0002',
  },
  {
    id: 3,
    client: 'Pedro Oliveira',
    service: 'Proteção de Pintura',
    date: '2026-10-18',
    time: '14:00',
    status: 'confirmado',
    vehicle: 'VW Golf',
    phone: '(88) 99999-0003',
  },
  {
    id: 4,
    client: 'Ana Costa',
    service: 'Lavagem Completa',
    date: '2026-10-18',
    time: '15:30',
    status: 'cancelado',
    vehicle: 'Hyundai HB20',
    phone: '(88) 99999-0004',
  },
  {
    id: 5,
    client: 'Carlos Lima',
    service: 'Higienização Interna',
    date: '2026-10-19',
    time: '09:30',
    status: 'pendente',
    vehicle: 'Fiat Argo',
    phone: '(88) 99999-0005',
  },
]

const stats = [
  {
    label: 'Agendamentos Hoje',
    value: '12',
    change: '+3',
    icon: Calendar,
    color: 'text-primary',
  },
  {
    label: 'Receita do Mês',
    value: 'R$ 4.850',
    change: '+18%',
    icon: DollarSign,
    color: 'text-accent',
  },
  {
    label: 'Clientes Ativos',
    value: '156',
    change: '+12',
    icon: Users,
    color: 'text-primary',
  },
  {
    label: 'Taxa de Conclusão',
    value: '94%',
    change: '+2%',
    icon: TrendingUp,
    color: 'text-accent',
  },
]

export function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [filterStatus, setFilterStatus] = useState('todos')

  const filteredAppointments = mockAppointments.filter((apt) => {
    if (filterStatus === 'todos') return true
    return apt.status === filterStatus
  })

  const statusColors = {
    confirmado: 'text-accent border-accent/40 bg-accent/10',
    pendente: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
    cancelado: 'text-red-400 border-red-400/40 bg-red-400/10',
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/60 bg-primary/10">
              <span className="text-sm font-bold text-primary">AC</span>
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-text-secondary">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary/60 hover:text-primary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Ver Site
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 md:flex">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'veiculos', label: 'Veículos', icon: Car },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface hover:text-text'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </aside>

        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <span className="text-xs text-accent">{stat.change}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xl font-semibold">{stat.value}</span>
                      <span className="text-xs text-text-secondary">{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Agendamentos Recentes</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('agendamentos')}
                    className="text-xs font-medium text-primary"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-text-secondary">Cliente</th>
                        <th className="px-4 py-3 text-xs font-medium text-text-secondary">Serviço</th>
                        <th className="px-4 py-3 text-xs font-medium text-text-secondary">Data</th>
                        <th className="px-4 py-3 text-xs font-medium text-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockAppointments.slice(0, 5).map((apt) => (
                        <tr key={apt.id} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{apt.client}</span>
                              <span className="text-xs text-text-tertiary">{apt.vehicle}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{apt.service}</td>
                          <td className="px-4 py-3 text-text-secondary">
                            {apt.date} {apt.time}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[apt.status as keyof typeof statusColors]}`}
                            >
                              {apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agendamentos' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Agendamentos</h2>
                <div className="flex gap-2">
                  {['todos', 'confirmado', 'pendente', 'cancelado'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilterStatus(status)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        filterStatus === status
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border text-text-secondary hover:border-primary/40'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-text-secondary">Cliente</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-secondary">Serviço</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-secondary">Veículo</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-secondary">Data/Hora</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-secondary">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-secondary">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{apt.client}</span>
                            <span className="text-xs text-text-tertiary">{apt.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{apt.service}</td>
                        <td className="px-4 py-3 text-text-secondary">{apt.vehicle}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {apt.date} {apt.time}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[apt.status as keyof typeof statusColors]}`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {apt.status === 'pendente' && (
                              <>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 text-accent transition hover:bg-accent/10"
                                  title="Confirmar"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-red-400/40 text-red-400 transition hover:bg-red-400/10"
                                  title="Cancelar"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clientes' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold">Clientes</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mockAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                        <span className="text-sm font-bold text-primary">
                          {apt.client.charAt(0)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{apt.client}</span>
                        <span className="text-xs text-text-tertiary">{apt.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Car className="h-3.5 w-3.5" />
                      {apt.vehicle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'veiculos' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold">Veículos</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mockAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{apt.vehicle}</span>
                      <span className="text-xs text-text-tertiary">{apt.client}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
