import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Search, Clock, Check, ShoppingCart, SearchX } from 'lucide-react'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { FlowFooter, FlowHeader, SelectionSummary } from '../components/FlowHeader'
import { ServiceImage } from '../components/ServiceImage'
import { getServicePriceLabel, getTotalLabel } from '../data/services'
import { VEHICLE_TYPES } from '../data/vehicles'

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function Services() {
  const navigate = useNavigate()
  const { services, loading } = useServices()
  const { vehicleType, setVehicleType, selectedIds, toggleService } = useBooking()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return services
    return services.filter((service) =>
      normalize(`${service.title} ${service.category} ${service.description}`).includes(q)
    )
  }, [services, query])

  // só conta serviços que ainda existem no catálogo
  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds]
  )
  const { label: totalLabel } = getTotalLabel(selectedServices, vehicleType)
  const count = selectedServices.length

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader
        step={1}
        title="Catálogo de serviços"
        subtitle="Selecione os serviços que deseja agendar"
      />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-48 pt-4">
        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-text-secondary">Tipo de veículo</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de veículo">
            {VEHICLE_TYPES.map((option) => {
              const active = vehicleType === option.value
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVehicleType(option.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition ${
                    active
                      ? 'border-primary bg-primary/10 text-text'
                      : 'border-transparent bg-surface text-text-secondary shadow-sm hover:border-border'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : ''}`} />
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-text-secondary">Pesquisar serviço</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lilac" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Informe o nome do serviço"
              className="w-full rounded-2xl border-2 border-transparent bg-surface-2 py-3 pl-11 pr-10 text-sm text-text placeholder:text-lilac/80 focus:border-primary/60 focus:bg-surface focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-tertiary transition hover:text-text"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </span>
        </label>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-8 text-center shadow-sm">
            <SearchX className="h-6 w-6 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              Nenhum serviço encontrado para “{query}”.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((service) => {
              const isSelected = selectedIds.includes(service.id)
              return (
                <article
                  key={service.id}
                  className={`animate-fade-up flex flex-col overflow-hidden rounded-2xl border-2 bg-surface shadow-sm transition ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <div className="relative">
                    <ServiceImage service={service} className="h-28" />
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <h3 className="text-sm font-semibold leading-snug">{service.title}</h3>
                    {service.duration && (
                      <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                        <Clock className="h-3 w-3" />
                        {service.duration} de duração
                      </span>
                    )}
                    <p className="text-xs leading-relaxed text-text-secondary">
                      <span className="line-clamp-3">{service.description}</span>
                      <Link
                        to={`/servico/${service.id}`}
                        className="font-bold text-text hover:underline"
                      >
                        ver mais
                      </Link>
                    </p>

                    <span className="mt-auto pt-1 text-sm font-bold text-text">
                      {getServicePriceLabel(service, vehicleType)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleService(service.id)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold transition active:scale-95 ${
                        isSelected
                          ? 'bg-primary text-white hover:bg-primary-600'
                          : 'bg-ink text-white hover:bg-ink-2'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-4 w-4" strokeWidth={3} />
                          Selecionado
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Selecionar
                        </>
                      )}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <FlowFooter
        summary={<SelectionSummary count={count} totalLabel={totalLabel} />}
        onBack={() => navigate('/')}
        onNext={() => navigate('/agendar')}
        disabled={count === 0 || !vehicleType}
      />
    </div>
  )
}
