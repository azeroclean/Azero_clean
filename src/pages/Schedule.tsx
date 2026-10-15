import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock } from 'lucide-react'
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

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const TIME_SLOTS = [
  '08:30',
  '09:30',
  '11:00',
  '14:00',
  '15:30',
  '16:30',
]

export function Schedule() {
  const navigate = useNavigate()
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const firstDay = startOfMonth(currentMonth)
  const lastDay = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: firstDay, end: lastDay })

  const startOffset = (getDay(firstDay) + 6) % 7

  const previousMonth = () => setCurrentMonth(addMonths(currentMonth, -1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const isDisabled = (date: Date) => isBefore(date, today)

  const monthLabel = useMemo(
    () => format(currentMonth, 'MMMM yyyy', { locale: ptBR }),
    [currentMonth]
  )

  const canContinue = Boolean(selectedDate && selectedTime)

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/servicos')}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary/60 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/60 bg-primary/10 text-[10px] font-semibold text-primary">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span>Serviços selecionados</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-black">
              2
            </span>
            <span className="hidden sm:inline">Data e horário</span>
          </div>
          <span className="text-xs text-text-tertiary">Passo 2</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-24">
        <section className="mt-4 flex flex-col gap-4">
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
                onClick={previousMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-primary/60 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-primary/60 hover:text-primary"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 px-4 text-center text-[11px] uppercase tracking-[0.3em] text-text-tertiary">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 px-4 py-3">
              {Array.from({ length: startOffset }).map((_, index) => (
                <span key={`offset-${index}`} />
              ))}
              {days.map((date) => {
                const disabled = isDisabled(date)
                const selected = selectedDate && isSameDay(selectedDate, date)
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDate(date)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
                      disabled
                        ? 'cursor-not-allowed text-text-tertiary/40'
                        : selected
                        ? 'bg-primary text-black shadow-[0_0_60px_-25px_rgba(0,210,255,1)]'
                        : 'text-text-secondary hover:border hover:border-primary/40'
                    }`}
                  >
                    {format(date, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Horários livres</h2>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((time) => {
              const active = selectedTime === time
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
                    active
                      ? 'border-primary/80 bg-primary text-black'
                      : 'border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {time}
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              {selectedDate
                ? `Data: ${format(selectedDate, 'dd/MM/yyyy')}`
                : 'Selecione a data'}
            </span>
            <span>
              Horário:{' '}
              <span className="font-semibold text-primary">
                {selectedTime || '—'}
              </span>
            </span>
          </div>
          <button
            type="button"
            disabled={!canContinue}
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
