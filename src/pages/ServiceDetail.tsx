import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle2, CalendarPlus, Check, Plus } from 'lucide-react'
import { useService } from '../hooks/useService'
import { useBooking } from '../context/booking-context'
import { getServicePriceLabel } from '../data/services'
import { ServiceImage } from '../components/ServiceImage'

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { service, loading } = useService(id)
  const { vehicleType, toggleService, isSelected } = useBooking()

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/servicos'))

  const header = (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={back}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text transition hover:bg-border"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">Detalhes do serviço</span>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text">
        {header}
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
          <div className="h-56 animate-pulse rounded-2xl bg-surface" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
        </main>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-text">
        <p className="text-sm text-text-secondary">Serviço não encontrado</p>
        <Link to="/servicos" className="font-semibold text-primary-600">
          Ver catálogo de serviços
        </Link>
      </div>
    )
  }

  const selected = isSelected(service.id)

  const selectAndSchedule = () => {
    if (!selected) toggleService(service.id)
    navigate('/servicos')
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {header}

      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-28 pt-4">
        <section className="animate-fade-up overflow-hidden rounded-2xl bg-surface shadow-sm">
          <ServiceImage service={service} className="h-56" />
          <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold">{service.title}</h1>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                {service.duration && (
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Clock className="h-4 w-4 text-lilac" />
                    {service.duration} de duração
                  </span>
                )}
                <span className="font-bold">{getServicePriceLabel(service, vehicleType)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Sobre o serviço</h2>
              <p className="text-sm leading-relaxed text-text-secondary">{service.description}</p>
            </div>

            {service.benefits.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">O que está incluso</h2>
                <ul className="flex flex-col gap-2">
                  {service.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => toggleService(service.id)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${
              selected ? 'bg-primary text-white' : 'bg-surface-2 text-text hover:bg-border'
            }`}
            aria-label={selected ? 'Remover serviço' : 'Adicionar serviço'}
            aria-pressed={selected}
          >
            {selected ? <Check className="h-5 w-5" strokeWidth={3} /> : <Plus className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={selectAndSchedule}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
          >
            <CalendarPlus className="h-4 w-4" />
            {selected ? 'Continuar agendamento' : 'Selecionar e agendar'}
          </button>
        </div>
      </footer>
    </div>
  )
}
