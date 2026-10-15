import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Search, ArrowRight, Clock, Check, Sparkles } from 'lucide-react'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { FlowHeader } from '../components/FlowHeader'

export function Services() {
  const navigate = useNavigate()
  const { services, loading } = useServices()
  const { selectedIds, toggleService } = useBooking()
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () =>
      services.filter((service) =>
        service.title.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [services, query]
  )

  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds]
  )

  const total = selectedServices.reduce((acc, service) => acc + service.price, 0)
  const count = selectedIds.length

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader step={1} title="Escolha os serviços" />

      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-40">
        <div className="mt-4 flex flex-col gap-1.5">
          <h1 className="text-base font-semibold">Quais serviços você deseja?</h1>
          <p className="text-sm text-text-secondary">
            Selecione um ou mais serviços para agendar.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar serviço"
            className="w-full rounded-full border border-border bg-surface-2 px-9 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition hover:text-text"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-3xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-8 text-center">
            <Sparkles className="h-5 w-5 text-text-tertiary" />
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
                  className={`group flex flex-col overflow-hidden rounded-3xl border bg-surface transition ${
                    isSelected
                      ? 'border-primary/80 shadow-[0_0_70px_-30px_rgba(0,210,255,0.9)]'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full border border-primary/40 bg-bg/80 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-primary backdrop-blur">
                      {service.category}
                    </span>
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <h3 className="text-sm font-semibold leading-snug">
                      {service.title}
                    </h3>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {service.description}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                      <Clock className="h-3 w-3" />
                      {service.duration}
                    </div>

                    <Link
                      to={`/servico/${service.id}`}
                      className="text-[11px] font-medium text-primary"
                    >
                      ver mais
                    </Link>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">
                        {service.priceLabel ?? `R$ ${service.price.toFixed(2)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`mt-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-primary text-black'
                          : 'border border-primary/60 text-primary hover:bg-primary/10'
                      }`}
                    >
                      {isSelected ? 'Selecionado' : 'Selecionar'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              {count === 0
                ? 'Nenhum serviço selecionado'
                : `${count} ${count === 1 ? 'serviço' : 'serviços'} selecionado${count === 1 ? '' : 's'}`}
            </span>
            <span>
              Total:{' '}
              <span className="font-semibold text-primary">
                R$ {total.toFixed(2)}
              </span>
            </span>
          </div>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => navigate('/agendar')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}
