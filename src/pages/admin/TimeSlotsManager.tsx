import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Clock, Loader2, Plus, X } from 'lucide-react'
import { AdminNotice, AdminSpinner, adminButton } from '../../components/AdminScreen'
import { addTimeSlots, fetchAdminTimeSlots, removeTimeSlot } from '../../lib/admin'
import type { TimeSlot } from '../../lib/admin'

// Ordem de exibição: segunda a domingo (0 = domingo)
const WEEKDAYS = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
]

export function TimeSlotsManager() {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [time, setTime] = useState('08:00')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setSlots(await fetchAdminTimeSlots())
    } catch (error) {
      setLoadError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminTimeSlots()
      .then((data) => !cancelled && setSlots(data))
      .catch((error: Error) => !cancelled && setLoadError(error.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<number, TimeSlot[]>()
    for (const slot of slots) map.set(slot.weekday, [...(map.get(slot.weekday) ?? []), slot])
    return map
  }, [slots])

  const toggleDay = (day: number) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    if (!time || days.length === 0) return
    setSaving(true)
    setActionError(null)
    try {
      await addTimeSlots(days.map((weekday) => ({ weekday, time })))
      setSlots(await fetchAdminTimeSlots())
    } catch (error) {
      setActionError((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    setActionError(null)
    try {
      await removeTimeSlot(id)
      setSlots((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      setActionError((error as Error).message)
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) return <AdminSpinner label="Carregando horários..." />

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-6">
        <AdminNotice
          icon={AlertTriangle}
          tone="danger"
          title="Erro ao carregar horários"
          action={
            <button type="button" onClick={load} className={`${adminButton} bg-ink text-white hover:bg-ink-2`}>
              Tentar novamente
            </button>
          }
        >
          {loadError}
        </AdminNotice>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm lg:p-5">
        <div>
          <h2 className="text-sm font-semibold">Adicionar horário</h2>
          <p className="text-xs text-text-secondary">
            Escolha a hora e os dias. Dias sem nenhum horário aparecem como fechados para o cliente.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border-2 border-transparent bg-surface-2 px-4 py-2.5 text-sm font-semibold focus:border-primary/60 focus:outline-none lg:w-36"
            aria-label="Horário"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Dias da semana">
            {WEEKDAYS.map((day) => {
              const active = days.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active ? 'bg-ink text-white' : 'bg-surface-2 text-text-secondary hover:text-text'
                  }`}
                >
                  {day.short}
                </button>
              )
            })}
          </div>
          <button
            type="submit"
            disabled={saving || days.length === 0}
            className={`${adminButton} bg-primary text-white hover:bg-primary-600 lg:ml-auto`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </button>
        </div>
        {actionError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">
            {actionError}
          </p>
        )}
      </form>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {WEEKDAYS.map((day) => {
          const daySlots = byDay.get(day.value) ?? []
          return (
            <section key={day.value} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{day.label}</h3>
                <span className="text-xs text-text-tertiary">
                  {daySlots.length === 0
                    ? 'Fechado'
                    : `${daySlots.length} ${daySlots.length === 1 ? 'horário' : 'horários'}`}
                </span>
              </div>
              {daySlots.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-xs font-semibold"
                    >
                      <Clock className="h-3 w-3 text-lilac" />
                      {slot.time}
                      <button
                        type="button"
                        onClick={() => handleRemove(slot.id)}
                        disabled={removingId !== null}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Remover ${slot.time} de ${day.label}`}
                      >
                        {removingId === slot.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
