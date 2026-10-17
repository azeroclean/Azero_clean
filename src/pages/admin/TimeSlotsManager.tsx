import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, Info, Loader2, Save } from 'lucide-react'
import { AdminNotice, AdminSpinner, adminButton } from '../../components/AdminScreen'
import { fetchAdminBusinessHours, saveBusinessHours } from '../../lib/admin'
import {
  daySlots,
  SLOT_STEP_MINUTES,
  toMinutes,
  toTime,
  WEEKDAYS,
} from '../../lib/schedule'
import type { DayHours, WeekHours } from '../../lib/schedule'

// Opções de hora de 30 em 30 min (05:00 a 23:30)
const TIME_OPTIONS = Array.from(
  { length: ((24 - 5) * 60) / SLOT_STEP_MINUTES },
  (_, i) => toTime(5 * 60 + i * SLOT_STEP_MINUTES)
)

function validateDay(day: DayHours): string | null {
  if (!day.isOpen) return null
  if (toMinutes(day.open) >= toMinutes(day.close)) return 'O fechamento precisa ser depois da abertura.'
  if (day.breakStart && day.breakEnd) {
    const [bs, be] = [toMinutes(day.breakStart), toMinutes(day.breakEnd)]
    if (bs >= be) return 'O fim do intervalo precisa ser depois do início.'
    if (bs < toMinutes(day.open) || be > toMinutes(day.close)) {
      return 'O intervalo precisa estar dentro do expediente.'
    }
  }
  return null
}

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-transparent bg-surface-2 px-3 py-2 text-sm font-semibold focus:border-primary/60 focus:outline-none"
      >
        {!TIME_OPTIONS.includes(value) && <option value={value}>{value}</option>}
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TimeSlotsManager() {
  const [week, setWeek] = useState<WeekHours | null>(null)
  const [saved, setSaved] = useState<string>('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const data = await fetchAdminBusinessHours()
      setWeek(data)
      setSaved(JSON.stringify(data))
    } catch (error) {
      setLoadError((error as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminBusinessHours()
      .then((data) => {
        if (cancelled) return
        setWeek(data)
        setSaved(JSON.stringify(data))
      })
      .catch((error: Error) => !cancelled && setLoadError(error.message))
    return () => {
      cancelled = true
    }
  }, [])

  const errors = useMemo(
    () =>
      week
        ? Object.fromEntries(WEEKDAYS.map((d) => [d.value, validateDay(week[d.value])]))
        : {},
    [week]
  )
  const hasErrors = Object.values(errors).some(Boolean)
  const dirty = week ? JSON.stringify(week) !== saved : false

  const updateDay = (weekday: number, patch: Partial<DayHours>) => {
    setJustSaved(false)
    setWeek((prev) => (prev ? { ...prev, [weekday]: { ...prev[weekday], ...patch } } : prev))
  }

  const copyMondayToWeekdays = () => {
    setJustSaved(false)
    setWeek((prev) =>
      prev ? { ...prev, 2: { ...prev[1] }, 3: { ...prev[1] }, 4: { ...prev[1] }, 5: { ...prev[1] } } : prev
    )
  }

  const handleSave = async () => {
    if (!week || hasErrors) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveBusinessHours(week)
      setSaved(JSON.stringify(week))
      setJustSaved(true)
    } catch (error) {
      setSaveError((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-6">
        <AdminNotice
          icon={AlertTriangle}
          tone="danger"
          title="Erro ao carregar o horário de funcionamento"
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

  if (!week) return <AdminSpinner label="Carregando horário de funcionamento..." />

  return (
    <div className="flex flex-col gap-4 pb-20 lg:pb-0">
      <div className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm lg:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-600">
          <Info className="h-4 w-4" />
        </span>
        <div className="text-sm">
          <p className="font-semibold">Informe só o expediente de cada dia</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            O site gera os horários de 30 em 30 minutos e mostra ao cliente apenas os que cabem a
            duração dos serviços escolhidos: o serviço termina antes do fechamento, não entra no
            intervalo e não bate com outro agendamento.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Horário de funcionamento</h2>
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-sm transition hover:text-text"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar segunda para ter–sex
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {WEEKDAYS.map(({ value, label }) => {
          const day = week[value]
          const slots = daySlots(day)
          const hasBreak = Boolean(day.breakStart && day.breakEnd)
          const error = errors[value]
          return (
            <section
              key={value}
              className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-2 transition ${
                error ? 'ring-red-300' : 'ring-transparent'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{label}</h3>
                <button
                  type="button"
                  role="switch"
                  aria-checked={day.isOpen}
                  aria-label={`${label}: ${day.isOpen ? 'aberto' : 'fechado'}`}
                  onClick={() => updateDay(value, { isOpen: !day.isOpen })}
                  className="flex items-center gap-2 text-xs font-semibold"
                >
                  <span className={day.isOpen ? 'text-primary-600' : 'text-text-tertiary'}>
                    {day.isOpen ? 'Aberto' : 'Fechado'}
                  </span>
                  <span
                    className={`relative h-6 w-11 rounded-full transition ${
                      day.isOpen ? 'bg-primary' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        day.isOpen ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>

              {day.isOpen && (
                <>
                  <div className="flex gap-2">
                    <TimeSelect label="Abre" value={day.open} onChange={(v) => updateDay(value, { open: v })} />
                    <TimeSelect label="Fecha" value={day.close} onChange={(v) => updateDay(value, { close: v })} />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                    <input
                      type="checkbox"
                      checked={hasBreak}
                      onChange={(e) =>
                        updateDay(
                          value,
                          e.target.checked
                            ? { breakStart: '12:00', breakEnd: '13:00' }
                            : { breakStart: null, breakEnd: null }
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    Fecha para intervalo (almoço)
                  </label>

                  {hasBreak && (
                    <div className="flex gap-2">
                      <TimeSelect
                        label="Intervalo de"
                        value={day.breakStart!}
                        onChange={(v) => updateDay(value, { breakStart: v })}
                      />
                      <TimeSelect
                        label="até"
                        value={day.breakEnd!}
                        onChange={(v) => updateDay(value, { breakEnd: v })}
                      />
                    </div>
                  )}

                  {error ? (
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  ) : (
                    <p className="text-[11px] text-text-tertiary">
                      {slots.length} horários de início ({slots[0]} às {slots[slots.length - 1]})
                      {hasBreak && `, exceto ${day.breakStart}–${day.breakEnd}`}
                    </p>
                  )}
                </>
              )}
            </section>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[68px] z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:static lg:rounded-2xl lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          {saveError && <p className="mr-auto text-xs font-medium text-red-600">{saveError}</p>}
          {justSaved && !dirty && (
            <span className="mr-auto flex items-center gap-1 text-xs font-semibold text-primary-600 lg:mr-0">
              <Check className="h-4 w-4" />
              Salvo
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || hasErrors || saving}
            className={`${adminButton} bg-primary text-white hover:bg-primary-600 disabled:bg-surface-2 disabled:text-text-tertiary`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar horários
          </button>
        </div>
      </div>
    </div>
  )
}
