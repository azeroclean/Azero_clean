import { BUSINESS } from '../data/business'

// Regras da agenda, usadas pelo site do cliente e pelo painel admin.

export const SLOT_STEP_MINUTES = 30
// Serviço sem duração cadastrada ocupa pelo menos um bloco.
export const DEFAULT_SERVICE_MINUTES = 30

export interface DayHours {
  isOpen: boolean
  open: string
  close: string
  breakStart: string | null
  breakEnd: string | null
}

export type WeekHours = Record<number, DayHours>

export const WEEKDAYS = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
]

// Expediente usado enquanto o banco não tem o horário de funcionamento.
export const DEFAULT_HOURS: WeekHours = Object.fromEntries(
  Array.from({ length: 7 }, (_, day) => {
    const hours = BUSINESS.hours[day]
    return [
      day,
      {
        isOpen: Boolean(hours),
        open: hours?.[0] ?? '08:00',
        close: hours?.[1] ?? '18:00',
        breakStart: null,
        breakEnd: null,
      },
    ]
  })
)

export const toMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

// Todos os inícios possíveis do dia, de 30 em 30 min (sem olhar a duração).
export function daySlots(hours: DayHours | undefined): string[] {
  if (!hours?.isOpen) return []
  const slots: string[] = []
  for (let t = toMinutes(hours.open); t < toMinutes(hours.close); t += SLOT_STEP_MINUTES) {
    slots.push(toTime(t))
  }
  return slots
}

export type Range = [number, number]

export interface SlotOption {
  time: string
  status: 'free' | 'booked' | 'past'
}

/**
 * Horários em que um serviço de `duration` minutos cabe inteiro no expediente:
 * termina até o fechamento e não entra no intervalo. Os que se sobrepõem a um
 * agendamento existente voltam como 'booked'; os que já passaram, como 'past'.
 */
export function availableSlots(
  isoDate: string,
  hours: DayHours | undefined,
  duration: number,
  booked: Range[],
  now = new Date()
): SlotOption[] {
  if (!hours?.isOpen) return []

  const length = Math.max(duration, DEFAULT_SERVICE_MINUTES)
  const close = toMinutes(hours.close)
  const breakRange: Range | null =
    hours.breakStart && hours.breakEnd
      ? [toMinutes(hours.breakStart), toMinutes(hours.breakEnd)]
      : null

  const isToday = isoDate === toIsoDate(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  return daySlots(hours)
    .map((time) => {
      const start = toMinutes(time)
      const end = start + length
      return { time, start, end }
    })
    .filter(({ start, end }) => end <= close && !(breakRange && overlaps(start, end, ...breakRange)))
    .map(({ time, start, end }) => ({
      time,
      status:
        isToday && start <= nowMinutes
          ? 'past'
          : booked.some(([bStart, bEnd]) => overlaps(start, end, bStart, bEnd))
          ? 'booked'
          : 'free',
    }))
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getOpenStatus(week: WeekHours, now = new Date()) {
  const today = week[now.getDay()]
  if (!today?.isOpen) return { open: false, label: 'Fechado hoje' }

  const minutes = now.getHours() * 60 + now.getMinutes()
  const inBreak =
    today.breakStart && today.breakEnd
      ? minutes >= toMinutes(today.breakStart) && minutes < toMinutes(today.breakEnd)
      : false
  const open = minutes >= toMinutes(today.open) && minutes < toMinutes(today.close) && !inBreak
  const fmt = (t: string) => t.replace(':00', 'h')
  const range = `${fmt(today.open)} às ${fmt(today.close)}`

  if (inBreak) return { open: false, label: `Intervalo · volta às ${fmt(today.breakEnd!)}` }
  return { open, label: open ? `Aberto agora · ${range}` : `Fechado · ${range}` }
}
