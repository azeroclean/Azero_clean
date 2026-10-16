import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CalendarDays,
  ShoppingBag,
  Loader2,
} from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { FlowHeader } from '../components/FlowHeader'
import { fetchBookedSlots } from '../lib/services'
import { getServicePrice } from '../data/services'
import { VEHICLE_LABELS } from '../data/vehicles'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const TIME_SLOTS = ['08:30', '09:30', '11:00', '14:00', '15:30', '16:30']

function isPastSlot(isoDate: string, slot: string) {
  const today = new Date()
  const todayIso = format(today, 'yyyy-MM-dd')
  if (isoDate !== todayIso) return false

  const [hours, minutes] = slot.split(':').map(Number)
  const slotDate = new Date()
  slotDate.setHours(hours, minutes, 0, 0)
  return slotDate.getTime() <= today.getTime()
}

export function Schedule() {
  const navigate = useNavigate()
  const { services } = useServices()
  const { vehicleType, selectedIds, date, time, setDate, setTime } = useBooking()

  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [slotResult, setSlotResult] = useState<{ date: string; times: string[] } | null>(
    null
  )

  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds]
  )

  const total = selectedServices.reduce(
    (acc, service) => acc + getServicePrice(service, vehicleType),
    0
  )

  useEffect(() => {
    if (!vehicleType) {
      navigate('/veiculo', { replace: true })
      return
    }
    if (selectedIds.length === 0) {
      navigate('/servicos', { replace: true })
    }
  }, [vehicleType, selectedIds.length, navigate])

  useEffect(() => {
    if (!date) return

    let active = true

    fetchBookedSlots(date).then((times) => {
      if (active) setSlotResult({ date, times })
    })

    return () => {
      active = false
    }
  }, [date])

  const loadingSlots = Boolean(date) && slotResult?.date !== date
  const bookedSlots = date && slotResult?.date === date ? slotResult.times : []

  const today = startOfToday()
  const firstDay = startOfMonth(currentMonth)
  const lastDay = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: firstDay, end: lastDay })
  const startOffset = (getDay(firstDay) + 6) % 7

  const selectedDate = date ? new Date(`${date}T00:00:00`) : null
  const canContinue = Boolean(date && time)

  const monthLabel = useMemo(
    () => format(currentMonth, 'MMMM yyyy', { locale: ptBR }),
    [currentMonth]
  )

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader step={3} title="Escolha a data" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-40">
        <section className="mt-4 flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              Serviços selecionados
            </div>
            {vehicleType && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-primary">
                {VEHICLE_LABELS[vehicleType]}
              </span>
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {selectedServices.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-secondary">{service.title}</span>
                <span className="text-text-tertiary">
                  {getServicePrice(service, vehicleType).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Total previsto</span>
            <span className="text-primary">
              {total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-base font-semibold">
              Para qual data você deseja agendar?
            </h1>
            <p className="text-sm text-text-secondary">
              Selecione uma data e o horário disponível.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-primary/60 hover:text-primary"
                aria-label="Mês anterior"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-primary/60 hover:text-primary"
                aria-label="Próximo mês"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 px-4 text-center text-[11px] uppercase tracking-[0.3em] text-text-tertiary">
              {WEEKDAYS.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 px-4 py-3">
              {Array.from({ length: startOffset }).map((_, index) => (
                <span key={`offset-${index}`} />
              ))}
              {days.map((day) => {
                const disabled = isBefore(day, today)
                const selected = selectedDate ? isSameDay(selectedDate, day) : false
                const isToday = isSameDay(day, today)

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setDate(format(day, 'yyyy-MM-dd'))
                      setTime(null)
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
                      disabled
                        ? 'cursor-not-allowed text-text-tertiary/40'
                        : selected
                        ? 'bg-primary font-semibold text-black shadow-[0_0_60px_-25px_rgba(0,210,255,1)]'
                        : isToday
                        ? 'border border-primary/40 text-primary'
                        : 'text-text-secondary hover:border hover:border-primary/40'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Horários disponíveis</h2>
            {selectedDate && (
              <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(selectedDate, 'dd/MM/yyyy')}
              </span>
            )}
          </div>

          {!date ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-text-tertiary">
              Selecione uma data para ver os horários.
            </p>
          ) : loadingSlots ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border p-4 text-xs text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando horários...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => {
                const booked = bookedSlots.includes(slot)
                const past = isPastSlot(date, slot)
                const disabled = booked || past
                const active = time === slot

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTime(slot)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
                      disabled
                        ? 'cursor-not-allowed border-border/60 text-text-tertiary/40 line-through'
                        : active
                        ? 'border-primary/80 bg-primary text-black'
                        : 'border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    {slot}
                  </button>
                )
              })}
            </div>
          )}

          {date && !loadingSlots && bookedSlots.length > 0 && (
            <p className="text-[11px] text-text-tertiary">
              Horários riscados já estão reservados.
            </p>
          )}
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              {selectedDate
                ? `Data: ${format(selectedDate, 'dd/MM/yyyy')}`
                : 'Selecione a data'}
            </span>
            <span>
              Horário:{' '}
              <span className="font-semibold text-primary">{time || '—'}</span>
            </span>
          </div>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => navigate('/dados')}
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
