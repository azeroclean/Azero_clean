import { Link, useLocation } from 'react-router-dom'
import { Check, MessageCircle, CalendarDays, Clock, Home, Car } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { VehicleType } from '../data/vehicles'
import { VEHICLE_LABELS } from '../data/vehicles'
import { BUSINESS, whatsappLink } from '../data/business'
import { FlowHeader } from '../components/FlowHeader'

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

interface ConfirmationState {
  name: string
  date: string
  time: string
  totalLabel: string
  vehicleType: VehicleType
  services: string[]
}

export function Confirmation() {
  const location = useLocation()
  const state = location.state as ConfirmationState | null
  const day = state ? new Date(`${state.date}T00:00:00`) : null

  const message =
    state && day
      ? [
          `Olá! Acabei de agendar na ${BUSINESS.name}.`,
          `Nome: ${state.name}`,
          `Data: ${format(day, 'dd/MM/yyyy')} às ${state.time}`,
          `Veículo: ${VEHICLE_LABELS[state.vehicleType]}`,
          `Serviços: ${state.services.join(', ')}`,
          `Total previsto: ${state.totalLabel}`,
        ].join('\n')
      : `Olá! Acabei de fazer um agendamento na ${BUSINESS.name}.`

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader step={4} title="Agendamento enviado" subtitle="Tudo certo por aqui!" />

      <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-8">
        <div className="animate-fade-up flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-[0_12px_40px_-12px_rgba(61,214,140,0.8)]">
          <Check className="h-10 w-10" strokeWidth={3} />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-bold">Agendamento realizado!</h2>
          <p className="max-w-xs text-sm text-text-secondary">
            {state
              ? `Obrigado, ${state.name.split(' ')[0]}! Você vai receber a confirmação pelo WhatsApp.`
              : 'Seu agendamento foi registrado com sucesso.'}
          </p>
        </div>

        {state && day && (
          <section className="w-full rounded-2xl bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-lilac" />
                {capitalize(format(day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }))}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-lilac" />
                {state.time}
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-lilac" />
                {VEHICLE_LABELS[state.vehicleType]}
              </div>
              <ul className="flex flex-col gap-1 border-t border-border pt-3 text-text-secondary">
                {state.services.map((service) => (
                  <li key={service}>• {service}</li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border pt-3 font-bold">
                <span>Total previsto</span>
                <span>{state.totalLabel}</span>
              </div>
            </div>
          </section>
        )}

        <div className="flex w-full flex-col gap-3">
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
          <Link
            to="/"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-ink-2"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  )
}
