import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, Loader2, Sun, Sunset } from 'lucide-react'
import { addDays, format, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { FlowFooter, FlowHeader, SelectionSummary } from '../components/FlowHeader'
import { fetchBookedSlots } from '../lib/services'
import { getTotalLabel } from '../data/services'
import { BUSINESS, isOpenDay } from '../data/business'

const TIME_SLOTS = ['08:30', '09:30', '11:00', '14:00', '15:30', '16:30']
const DAYS_AHEAD = 30

function slotStatus(isoDate: string, slot: string, booked: string[]) {
  const day = new Date(`${isoDate}T00:00:00`)
  const hours = BUSINESS.hours[day.getDay()]
  if (!hours || slot < hours[0] || slot >= hours[1]) return 'closed'
  if (booked.includes(slot)) return 'booked'

  const [h, m] = slot.split(':').map(Number)
  const slotDate = new Date(day)
  slotDate.setHours(h, m, 0, 0)
  if (slotDate.getTime() <= Date.now()) return 'past'

  return 'free'
}

export function Schedule() {
  const navigate = useNavigate()
  const { services, loading } = useServices()
  const { vehicleType, selectedIds, date, time, setDate, setTime } = useBooking()
  const [slotResult, setSlotResult] = useState<{ date: string; times: string[] } | null>(
    null
  )
  const timesRef = useRef<HTMLElement>(null)

  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds]
  )
  const { label: totalLabel } = getTotalLabel(selectedServices, vehicleType)

  useEffect(() => {
    if (!loading && selectedServices.length === 0) {
      navigate('/servicos', { replace: true })
    }
  }, [loading, selectedServices.length, navigate])

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

  const days = useMemo(() => {
    const today = startOfToday()
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i))
  }, [])

  const loadingSlots = Boolean(date) && slotResult?.date !== date
  const bookedSlots = useMemo(
    () => (date && slotResult?.date === date ? slotResult.times : []),
    [date, slotResult]
  )

  const slots = useMemo(
    () =>
      date && !loadingSlots
        ? TIME_SLOTS.map((slot) => ({ slot, status: slotStatus(date, slot, bookedSlots) }))
            .filter((s) => s.status !== 'closed')
        : [],
    [date, loadingSlots, bookedSlots]
  )
  const freeCount = slots.filter((s) => s.status === 'free').length

  // se o horário salvo não estiver mais disponível, limpa a seleção
  useEffect(() => {
    if (!time || loadingSlots || !date) return
    const current = slots.find((s) => s.slot === time)
    if (!current || current.status !== 'free') setTime(null)
  }, [slots, time, date, loadingSlots, setTime])

  const selectedDate = date ? new Date(`${date}T00:00:00`) : null
  const canContinue = Boolean(date && time)

  const pickDate = (day: Date) => {
    const iso = format(day, 'yyyy-MM-dd')
    if (iso === date) return
    setDate(iso)
    setTime(null)
    requestAnimationFrame(() =>
      timesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    )
  }

  const morning = slots.filter((s) => s.slot < '12:00')
  const afternoon = slots.filter((s) => s.slot >= '12:00')

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader
        step={2}
        title="Datas e horários"
        subtitle="Selecione a data e o horário que deseja agendar"
      />

      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-48 pt-4">
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Para qual data você deseja agendar?</h2>
            <CalendarDays className="h-4 w-4 text-lilac" />
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {days.map((day) => {
              const iso = format(day, 'yyyy-MM-dd')
              const closed = !isOpenDay(day)
              const active = iso === date
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={closed}
                  onClick={() => pickDate(day)}
                  aria-pressed={active}
                  className={`flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border-2 py-2.5 transition ${
                    active
                      ? 'border-primary bg-primary text-white'
                      : closed
                      ? 'cursor-not-allowed border-transparent bg-bg text-text-tertiary/60'
                      : 'border-transparent bg-surface-2 text-text hover:border-primary/50'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase">
                    {format(day, 'EEEEEE', { locale: ptBR })}
                  </span>
                  <span className="text-lg font-bold leading-none">{format(day, 'd')}</span>
                  <span className="text-[10px] capitalize">
                    {format(day, 'MMM', { locale: ptBR }).replace('.', '')}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section ref={timesRef} className="scroll-mb-48 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Horários disponíveis</h2>
            {selectedDate && (
              <span className="text-xs text-text-secondary first-letter:uppercase">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            )}
          </div>

          {!date ? (
            <p className="rounded-xl bg-surface-2 p-4 text-center text-xs text-lilac">
              Selecione uma data para ver os horários.
            </p>
          ) : loadingSlots ? (
            <div className="flex items-center justify-center gap-2 p-4 text-xs text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando horários...
            </div>
          ) : freeCount === 0 ? (
            <p className="rounded-xl bg-surface-2 p-4 text-center text-xs text-lilac">
              Não há horários livres nesta data. Escolha outro dia.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {[
                { label: 'Manhã', icon: Sun, items: morning },
                { label: 'Tarde', icon: Sunset, items: afternoon },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.label} className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                      <group.icon className="h-3.5 w-3.5" />
                      {group.label}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map(({ slot, status }) => {
                        const disabled = status !== 'free'
                        const active = time === slot
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={disabled}
                            onClick={() => setTime(slot)}
                            aria-pressed={active}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                              disabled
                                ? 'cursor-not-allowed border-transparent bg-bg text-text-tertiary/60 line-through'
                                : active
                                ? 'border-primary bg-primary text-white'
                                : 'border-transparent bg-surface-2 text-text hover:border-primary/50'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {slot}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              {freeCount < slots.length && (
                <p className="text-[11px] text-text-tertiary">
                  Horários riscados já estão reservados ou passaram.
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <FlowFooter
        summary={<SelectionSummary count={selectedServices.length} totalLabel={totalLabel} />}
        onBack={() => navigate('/servicos')}
        onNext={() => navigate('/dados')}
        disabled={!canContinue}
      />
    </div>
  )
}
