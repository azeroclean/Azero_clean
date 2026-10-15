import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react'
import { services } from '../data/services'

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const service = services.find((item) => item.id === id)

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-text">
        <p className="text-sm text-text-secondary">Serviço não encontrado</p>
        <Link to="/servicos" className="text-primary">
          Voltar para serviços
        </Link>
      </div>
    )
  }

  const priceDisplay = service.priceLabel || `A partir de R$ ${service.price.toFixed(2)}`

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary/60 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
          <span className="text-sm font-medium">Detalhe do serviço</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-24">
        <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
          <img
            src={service.image}
            alt={service.title}
            className="h-56 w-full object-cover"
          />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-semibold">{service.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Duração de aprox. {service.duration}</span>
                </div>
                <span className="text-primary">{priceDisplay}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Sobre o serviço</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {service.description}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Benefícios</h2>
              <ul className="flex flex-col gap-2">
                {service.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/servicos')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-600 active:scale-[0.98]"
          >
            Selecionar serviço
          </button>
        </div>
      </footer>
    </div>
  )
}
