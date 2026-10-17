import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Loader2,
  MessageCircle,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import {
  deleteAppointment,
  fetchDayBookings,
  notifyClient,
  rescheduleAppointment,
  updateAppointmentStatus,
} from '../../lib/admin'
import type { AdminAppointment } from '../../lib/admin'
import { useServices } from '../../hooks/useServices'
import { useBusinessHours } from '../../hooks/useBusinessHours'
import { totalDuration, formatDuration } from '../../data/services'
import { availableSlots, DEFAULT_SERVICE_MINUTES, toIsoDate, toMinutes } from '../../lib/schedule'
import type { Range } from '../../lib/schedule'

export type EditorResult =
  | { type: 'updated'; appointment: AdminAppointment }
  | { type: 'deleted'; id: string }

interface Props {
  appointment: AdminAppointment
  onClose: () => void
  onDone: (result: EditorResult, message: string) => void
}

const longDate = (iso: string) => {
  const text = format(new Date(`${iso}T00:00:00`), "EEE, d 'de' MMM", { locale: ptBR })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

type Busy = 'reschedule' | 'cancel' | 'delete' | null

export function AppointmentEditor({ appointment: apt, onClose, onDone }: Props) {
  const { services } = useServices()
  const { hours: week, loading: loadingHours } = useBusinessHours()
  const [date, setDate] = useState(apt.date)
  const [time, setTime] = useState<string | null>(null)
  const [bookings, setBookings] = useState<{ date: string; ranges: Range[] } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notify, setNotify] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [today] = useState(() => toIsoDate(new Date()))
  const canceled = apt.status === 'cancelado'

  const duration = useMemo(
    () => totalDuration(services.filter((s) => apt.serviceIds.includes(s.id))),
    [services, apt.serviceIds]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  useEffect(() => {
    if (!date || services.length === 0) return
    let active = true
    fetchDayBookings(date, apt.id)
      .then((rows) => {
        if (!active) return
        const ranges = rows.map((row): Range => {
          const start = toMinutes(row.time)
          const minutes = totalDuration(services.filter((s) => row.service_ids.includes(s.id)))
          return [start, start + Math.max(minutes, DEFAULT_SERVICE_MINUTES)]
        })
        setBookings({ date, ranges })
        setLoadError(null)
      })
      .catch((err: Error) => active && setLoadError(err.message))
    return () => {
      active = false
    }
  }, [date, apt.id, services])

  const loadingSlots = loadingHours || bookings?.date !== date
  const slots = useMemo(() => {
    if (loadingSlots || !bookings) return []
    const dayHours = week[new Date(`${date}T00:00:00`).getDay()]
    return availableSlots(date, dayHours, duration, bookings.ranges).filter(
      (s) => s.status === 'free'
    )
  }, [loadingSlots, bookings, week, date, duration])

  const dayClosed = !week[new Date(`${date}T00:00:00`).getDay()]?.isOpen
  const changed = time !== null && (date !== apt.date || time !== apt.time)

  // A ação no banco sempre vale; se o WhatsApp falhar, avisa sem desfazer.
  const sendNotice = async (fn: () => Promise<void>) => {
    if (!notify) return ''
    try {
      await fn()
      return ' Cliente avisado no WhatsApp.'
    } catch (err) {
      return ` Atenção: ${(err as Error).message}`
    }
  }

  const handleReschedule = async () => {
    if (!time || !changed) return
    setBusy('reschedule')
    setError(null)
    try {
      await rescheduleAppointment(apt.id, date, time)
      const notice = await sendNotice(() =>
        notifyClient(apt.id, {
          event: 'reagendado',
          previous: { date: apt.date, time: apt.time },
          note,
        })
      )
      onDone(
        { type: 'updated', appointment: { ...apt, date, time } },
        `Remarcado para ${longDate(date)} às ${time}.${notice}`
      )
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  const handleCancel = async () => {
    setBusy('cancel')
    setError(null)
    try {
      await updateAppointmentStatus(apt.id, 'cancelado')
      const notice = await sendNotice(() => notifyClient(apt.id, { event: 'cancelado', note }))
      onDone(
        { type: 'updated', appointment: { ...apt, status: 'cancelado' } },
        `Agendamento cancelado.${notice}`
      )
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    setBusy('delete')
    setError(null)
    try {
      // avisa antes de apagar: depois a função não encontra mais o agendamento
      const notice =
        canceled ? '' : await sendNotice(() => notifyClient(apt.id, { event: 'cancelado', note }))
      await deleteAppointment(apt.id)
      onDone({ type: 'deleted', id: apt.id }, `Agendamento excluído.${notice}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Editar agendamento de ${apt.client}`}
        onClick={(event) => event.stopPropagation()}
        className="animate-fade-up flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-base font-bold">{apt.client}</p>
            <p className="truncate text-xs text-text-secondary">
              {apt.service} · {apt.vehicle}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Atual: {longDate(apt.date)} às {apt.time}
              {duration > 0 && ` · ${formatDuration(duration)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:text-text"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {!canceled && (
            <section className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-lilac" />
                Remarcar
              </h3>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => {
                  setDate(e.target.value)
                  setTime(null)
                }}
                className="rounded-xl border-2 border-transparent bg-surface-2 px-4 py-2.5 text-sm font-semibold focus:border-primary/60 focus:outline-none"
                aria-label="Nova data"
              />
              {loadError ? (
                <p className="text-xs text-red-600">{loadError}</p>
              ) : loadingSlots ? (
                <p className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando horários...
                </p>
              ) : dayClosed ? (
                <p className="rounded-xl bg-surface-2 p-3 text-center text-xs text-lilac">
                  Fechado nesse dia. Escolha outra data.
                </p>
              ) : slots.length === 0 ? (
                <p className="rounded-xl bg-surface-2 p-3 text-center text-xs text-lilac">
                  Nenhum horário livre que caiba o serviço nesse dia.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {slots.map((slot) => {
                    const active = time === slot.time
                    const current = date === apt.date && slot.time === apt.time
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setTime(slot.time)}
                        aria-pressed={active}
                        className={`rounded-xl border-2 py-2 text-sm font-semibold transition ${
                          active
                            ? 'border-primary bg-primary text-white'
                            : current
                            ? 'border-dashed border-text-tertiary bg-surface text-text-secondary'
                            : 'border-transparent bg-surface-2 hover:border-primary/50'
                        }`}
                        title={current ? 'Horário atual' : undefined}
                      >
                        {slot.time}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          <section className="flex flex-col gap-2 rounded-2xl bg-bg p-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <MessageCircle className="h-4 w-4 text-primary-600" />
              Avisar o cliente pelo WhatsApp
            </label>
            {notify && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Recado opcional (ex.: motivo da mudança)"
                className="w-full resize-none rounded-xl border-2 border-transparent bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary/60 focus:outline-none"
              />
            )}
          </section>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!canceled && (
            <button
              type="button"
              onClick={handleReschedule}
              disabled={!changed || busy !== null}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white transition hover:bg-primary-600 disabled:bg-surface-2 disabled:text-text-tertiary"
            >
              {busy === 'reschedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {time && changed ? `Remarcar para ${time}` : 'Escolha o novo horário'}
            </button>
          )}

          {confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-red-50 p-3">
              <p className="text-xs font-medium text-red-700">
                Excluir apaga o agendamento de vez{!canceled && notify ? ' (o cliente será avisado do cancelamento)' : ''}.
                Não dá para desfazer.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy !== null}
                  className="h-10 flex-1 rounded-full bg-surface text-sm font-semibold text-text-secondary"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy !== null}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir de vez
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {!canceled && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy !== null}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Cancelar agendamento
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy !== null}
                className={`flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 ${
                  canceled ? 'flex-1 bg-red-50' : ''
                }`}
                aria-label="Excluir agendamento"
              >
                <Trash2 className="h-4 w-4" />
                {canceled && 'Excluir agendamento'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
