import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Phone,
  MessageCircle,
  Camera,
  MapPin,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
} from 'lucide-react'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { getServicePriceLabel } from '../data/services'
import { BUSINESS, getOpenStatus, whatsappLink } from '../data/business'
import { ServiceImage } from '../components/ServiceImage'
import { DeveloperCredit } from '../components/DeveloperCredit'

const CURRENT_YEAR = new Date().getFullYear()

const formatPhone = (digits: string) =>
  digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')

export function Home() {
  const navigate = useNavigate()
  const { services, loading } = useServices()
  const { vehicleType, isSelected, toggleService } = useBooking()
  const carouselRef = useRef<HTMLDivElement>(null)
  const status = getOpenStatus()

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const scheduleService = (id: string) => {
    if (!isSelected(id)) toggleService(id)
    navigate('/servicos')
  }

  const contactButtons = [
    { href: `tel:${BUSINESS.phone}`, label: 'Ligar', icon: Phone },
    { href: whatsappLink(), label: 'WhatsApp', icon: MessageCircle, external: true },
    { href: BUSINESS.instagram, label: 'Instagram', icon: Camera, external: true },
  ]

  return (
    <div className="min-h-screen bg-surface text-text">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(61,214,140,0.18),transparent_55%)]" />
        <div className="relative mx-auto flex max-w-md flex-col gap-6 px-5 pb-10 pt-12">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="text-2xl font-black tracking-tight text-ink">AC</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="text-xl font-bold">{BUSINESS.name}</h1>
              <span className="flex items-center gap-1.5 text-sm text-white/80">
                <MapPin className="h-4 w-4 shrink-0" />
                {BUSINESS.tagline}
              </span>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  status.open ? 'bg-primary text-white' : 'bg-white/15 text-white/80'
                }`}
              >
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {contactButtons.map(({ href, label, icon: Icon, external }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
              >
                <Icon className="h-6 w-6" />
              </a>
            ))}
          </div>

          <Link
            to="/servicos"
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_30px_-12px_rgba(61,214,140,0.9)] transition hover:bg-primary-600 active:scale-[0.98]"
          >
            Agendar horário
            <CalendarDays className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <main className="mx-auto flex max-w-md flex-col">
        <section className="flex flex-col gap-4 py-8">
          <div className="flex items-end justify-between gap-3 px-5">
            <div>
              <h2 className="text-lg font-medium">Conheça nossos serviços</h2>
              <p className="text-sm text-lilac">Reserve seu horário agora!</p>
            </div>
            <div className="flex gap-2">
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => scrollCarousel(dir)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-lilac transition hover:bg-border"
                  aria-label={dir === -1 ? 'Serviços anteriores' : 'Próximos serviços'}
                >
                  {dir === -1 ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={carouselRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-5 px-5 pb-4"
          >
            {loading &&
              Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-96 w-[78%] shrink-0 animate-pulse rounded-2xl bg-surface-2"
                />
              ))}
            {services.map((service) => (
              <article
                key={service.id}
                className="flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_10px_30px_-18px_rgba(21,23,34,0.35)]"
              >
                <ServiceImage service={service} className="h-48" />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-base font-semibold">{service.title}</h3>
                  {service.duration && (
                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Clock className="h-3.5 w-3.5" />
                      {service.duration} de duração
                    </span>
                  )}
                  <p className="text-sm text-text-secondary">
                    <span className="line-clamp-2">{service.description}</span>
                    <Link to={`/servico/${service.id}`} className="font-bold text-text hover:underline">
                      ver mais
                    </Link>
                  </p>
                  <span className="mt-auto pt-2 text-sm font-bold">
                    {getServicePriceLabel(service, vehicleType)}
                  </span>
                  <button
                    type="button"
                    onClick={() => scheduleService(service.id)}
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Agendar horário
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-border px-5 py-8">
          <h2 className="text-lg font-medium">Onde estamos?</h2>
          <p className="text-sm text-lilac">{BUSINESS.address}</p>
          <div className="h-56 overflow-hidden rounded-2xl border border-border bg-surface-2">
            <iframe
              title={`Localização ${BUSINESS.name}`}
              src={BUSINESS.mapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>

        <section className="border-t border-border px-5 py-8">
          <div className="overflow-hidden rounded-2xl border border-primary/40">
            <div className="flex h-24 items-center justify-center bg-ink">
              <span className="text-2xl font-black uppercase tracking-[0.2em] text-white">
                {BUSINESS.name}
              </span>
            </div>
            <div className="relative flex flex-col items-center gap-3 bg-gradient-to-b from-surface to-surface-2 px-6 pb-6 pt-12 text-center">
              <div className="absolute -top-10 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md">
                <span className="text-xl font-black text-ink">AC</span>
              </div>
              <h3 className="text-base font-bold">Entre em contato agora mesmo</h3>
              <p className="text-sm text-text-secondary">
                Nós da {BUSINESS.name} estamos prontos para te atender
              </p>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                <MessageCircle className="h-5 w-5" />
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-6 text-xs text-text-secondary">
          <span className="font-bold uppercase tracking-[0.3em] text-text">{BUSINESS.name}</span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a
              href={BUSINESS.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-text"
            >
              <Camera className="h-3.5 w-3.5" />
              {BUSINESS.instagramHandle}
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-text"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {formatPhone(BUSINESS.phone)}
            </a>
          </div>
          <span>© {CURRENT_YEAR} · Todos os direitos reservados</span>
          <DeveloperCredit />
        </div>
      </footer>
    </div>
  )
}
