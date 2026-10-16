import { Link, useLocation } from 'react-router-dom'
import {
  CheckCircle2,
  MessageCircle,
  CalendarDays,
  Clock,
  Home,
  Car,
} from 'lucide-react'
import { format } from 'date-fns'
import type { VehicleType } from '../data/vehicles'
import { VEHICLE_LABELS } from '../data/vehicles'

interface ConfirmationState {
  name: string
  date: string
  time: string
  total: number
  vehicleType: VehicleType
  services: string[]
}

const WHATSAPP_NUMBER = '5588994987680'

export function Confirmation() {
  const location = useLocation()
  const state = location.state as ConfirmationState | null

  const whatsappText = state
    ? encodeURIComponent(
        `Olá! Acabei de agendar na Azero Clean.%0A` +
          `Nome: ${state.name}%0A` +
          `Data: ${format(new Date(`${state.date}T00:00:00`), 'dd/MM/yyyy')} às ${state.time}%0A` +
          `Serviços: ${state.services.join(', ')}%0A` +
          `Total: R$ ${state.total.toFixed(2)}`
      )
    : encodeURIComponent('Olá! Acabei de fazer um agendamento na Azero Clean.')

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`

  return (
    <div className="min-h-screen bg-bg text-text">
      <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/10 shadow-[0_0_80px_-30px_rgba(0,230,118,0.9)]">
          <CheckCircle2 className="h-10 w-10 text-accent" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold">Agendamento confirmado!</h1>
          <p className="text-sm text-text-secondary">
            {state
              ? `Obrigado, ${state.name.split(' ')[0]}! Recebemos seu agendamento e vamos confirmar em breve.`
              : 'Seu agendamento foi registrado com sucesso.'}
          </p>
        </div>

        {state && (
          <section className="w-full rounded-3xl border border-border bg-surface p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <CalendarDays className="h-4 w-4 text-primary" />
                {format(new Date(`${state.date}T00:00:00`), "dd 'de' MMMM 'de' yyyy")}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock className="h-4 w-4 text-primary" />
                {state.time}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Car className="h-4 w-4 text-primary" />
                {VEHICLE_LABELS[state.vehicleType]}
              </div>
              <div className="mt-1 flex flex-col gap-1.5 border-t border-border pt-3">
                {state.services.map((service) => (
                  <span key={service} className="text-sm text-text-secondary">
                    {service}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Total previsto</span>
                <span className="text-primary">R$ {state.total.toFixed(2)}</span>
              </div>
            </div>
          </section>
        )}

        <div className="flex w-full flex-col gap-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-text-secondary transition hover:border-primary/60 hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>

        <p className="text-center text-xs text-text-tertiary">
          Em caso de dúvidas, entre em contato pelo WhatsApp.
        </p>
      </main>
    </div>
  )
}
