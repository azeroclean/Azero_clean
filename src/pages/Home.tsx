import { Link } from 'react-router-dom'
import {
  Phone,
  MessageCircle,
  Camera,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Droplets,
} from 'lucide-react'
import { useServices } from '../hooks/useServices'

const CURRENT_YEAR = new Date().getFullYear()

const features = [
  {
    icon: Droplets,
    title: 'Lavagem Completa',
    description: 'Ducha alta pressão, detalhamento de chassi e rodas.',
  },
  {
    icon: Sparkles,
    title: 'Higienização Interna',
    description: 'Extração a seco de estofados e dutos de A/C.',
  },
  {
    icon: ShieldCheck,
    title: 'Proteção de Pintura',
    description: 'Selante cerâmico para máximo brilho e proteção.',
  },
]

export function Home() {
  const { services, loading } = useServices()
  const whatsappLink = 'https://wa.me/5588994987680'
  const instagramLink = 'https://instagram.com/azeroclean'
  const telLink = 'tel:88994987680'

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/60 bg-primary/10">
              <span className="text-sm font-bold text-primary">AC</span>
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-text-secondary">
              Azero Clean
            </span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Aberto agora
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-8 px-4 pb-10">
        <section className="mt-6 flex flex-col gap-5 rounded-3xl border border-border bg-surface/80 p-5 shadow-[0_0_80px_-40px_rgba(0,210,255,0.8)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/70 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent">
                <span className="text-lg font-bold text-primary">AC</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold">Azero Clean</h1>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" />
                  <span>Seu Carro Sempre com Outro Nível</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Atendimento conforme agendamento</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={telLink}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 transition hover:border-primary/60 hover:text-primary"
                aria-label="Ligar"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 transition hover:border-primary/60 hover:text-primary"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={instagramLink}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 transition hover:border-primary/60 hover:text-primary"
                aria-label="Instagram"
              >
                <Camera className="h-4 w-4" />
              </a>
            </div>
          </div>

          <Link
            to="/veiculo"
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-600 active:scale-[0.98]"
          >
            AGENDAR HORÁRIO
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Conheça nossos serviços</h2>
            <Link to="/servicos" className="text-xs font-medium text-primary">
              Ver todos
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-72 min-w-[78%] animate-pulse rounded-3xl border border-border bg-surface"
                />
              ))}
            {services.map((service) => (
              <article
                key={service.id}
                className="flex min-w-[78%] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_40px_80px_-60px_rgba(0,210,255,0.9)]"
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className="h-40 w-full object-cover"
                />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-primary">
                      {service.category}
                    </span>
                    <span className="text-xs text-text-tertiary">{service.duration}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-semibold">{service.title}</h3>
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {service.description}
                    </p>
                    <Link
                      to={`/servico/${service.id}`}
                      className="text-xs font-medium text-primary"
                    >
                      ver mais
                    </Link>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-base font-semibold text-primary">
                      {service.priceLabel || `R$ ${service.price.toFixed(2)}`}
                    </span>
                    <Link
                      to={`/servico/${service.id}`}
                      className="rounded-full border border-primary/60 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    >
                      Agendar horário
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Por que escolher a Azero Clean?</h2>
          <div className="grid grid-cols-1 gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-text-secondary">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Onde estamos?</h2>
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2 text-sm text-text-secondary">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <p>
                  R. Exemplo, 123 - Centro
                  <br />
                  Cidade - UF, CEP 00000-000
                </p>
              </div>
              <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-border">
                <iframe
                  title="Localização Azero Clean"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3974.123456789!2d-39.123456!3d-6.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7a0b123456789abc%3A0x123456789abcdef0!2sAzero%20Clean!5e0!3m2!1spt-BR!2sbr!4v1234567890123"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-bg/95">
        <div className="mx-auto flex max-w-md flex-col items-center gap-1 px-4 py-5 text-xs text-text-tertiary">
          <span className="uppercase tracking-[0.4em] text-text-secondary">Azero Clean</span>
          <span>© {CURRENT_YEAR} Azero Clean. Todos os direitos reservados.</span>
          <span className="text-text-tertiary">Cuidando do seu carro.</span>
        </div>
      </footer>
    </div>
  )
}
