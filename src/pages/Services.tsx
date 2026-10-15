import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Search, ArrowRight } from 'lucide-react'
import { services } from '../data/services'

export function Services() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const filtered = services.filter((service) =>
    service.title.toLowerCase().includes(query.toLowerCase())
  )

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    )
  }

  const total = services
    .filter((service) => selected.includes(service.id))
    .reduce((acc, service) => acc + service.price, 0)

  const count = selected.length

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary/60 hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Fechar
          </button>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-black">
              1
            </span>
            <span>Selecione serviços</span>
          </div>
          <span className="text-xs text-text-tertiary">Passo 1</span>
        </div>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Informe o nome do serviço"
              className="w-full rounded-full border border-border bg-surface-2 px-9 py-2 text-sm text-text placeholder:text-text-tertiary focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-3 px-4 pb-24">
        <div className="mt-4 grid grid-cols-2 gap-3">
          {filtered.map((service) => {
            const isSelected = selected.includes(service.id)
            return (
              <article
                key={service.id}
                className={`flex flex-col overflow-hidden rounded-3xl border bg-surface transition ${
                  isSelected
                    ? 'border-primary/80 shadow-[0_0_70px_-30px_rgba(0,210,255,0.9)]'
                    : 'border-border'
                }`}
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className="h-28 w-full object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug">
                      {service.title}
                    </h3>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                      {service.duration}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {service.description}
                  </p>
                  <Link
                    to={`/servico/${service.id}`}
                    className="text-[11px] font-medium text-primary"
                  >
                    ver mais
                  </Link>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      {service.priceLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(service.id)}
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
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{count} serviços selecionados</span>
            <span>
              Total previsto:{' '}
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
