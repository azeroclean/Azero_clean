import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { FlowFooter, FlowHeader, SelectionSummary } from '../components/FlowHeader'
import { createAppointment, fetchClientNameByPhone } from '../lib/services'
import { getServicePriceLabel, getTotalLabel } from '../data/services'
import { VEHICLE_LABELS } from '../data/vehicles'

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

interface FormState {
  name: string
  phone: string
}

const PROFILE_KEY = 'azero-clean:client'

function readProfile(): FormState {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FormState>
      return { name: parsed.name ?? '', phone: parsed.phone ?? '' }
    }
  } catch {
    // ignora
  }
  return { name: '', phone: '' }
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const isValidPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 11 || digits.length === 10
}

export function ClientInfo() {
  const navigate = useNavigate()
  const { services, loading } = useServices()
  const { vehicleType, selectedIds, date, time, reset } = useBooking()

  const [form, setForm] = useState<FormState>(readProfile)
  const [touched, setTouched] = useState({ name: false, phone: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundPhone, setFoundPhone] = useState<string | null>(null)
  const submittedRef = useRef(false)
  const digitsRef = useRef('')

  const nameFound = foundPhone === form.phone

  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds]
  )
  const { total, label: totalLabel } = getTotalLabel(selectedServices, vehicleType)

  useEffect(() => {
    if (submittedRef.current || loading) return
    if (selectedServices.length === 0) navigate('/servicos', { replace: true })
    else if (!date || !time) navigate('/agendar', { replace: true })
  }, [loading, selectedServices.length, date, time, navigate])

  useEffect(() => {
    const digits = form.phone.replace(/\D/g, '')
    if (digits === digitsRef.current) return
    digitsRef.current = digits

    if (digits.length < 10) return

    let active = true
    const timer = setTimeout(() => {
      fetchClientNameByPhone(form.phone).then((name) => {
        if (!active || !name) return
        setFoundPhone(form.phone)
        setForm((prev) => (prev.name.trim() ? prev : { ...prev, name }))
      })
    }, 400)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [form.phone])

  const phoneOk = isValidPhone(form.phone)
  const nameOk = form.name.trim().length >= 2
  const canSubmit = phoneOk && nameOk

  const handleSubmit = async () => {
    setError(null)
    setTouched({ name: true, phone: true })
    if (!canSubmit) return

    if (!vehicleType || !date || !time) {
      setError('Volte e selecione data e horário.')
      return
    }

    setSubmitting(true)

    try {
      await createAppointment({
        client_name: form.name.trim(),
        client_phone: form.phone.trim(),
        vehicle_type: vehicleType,
        service_ids: selectedServices.map((service) => service.id),
        date,
        time,
        total,
      })

      try {
        window.localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({ name: form.name.trim(), phone: form.phone })
        )
      } catch {
        // opcional
      }

      submittedRef.current = true
      navigate('/confirmacao', {
        replace: true,
        state: {
          name: form.name.trim(),
          date,
          time,
          totalLabel,
          vehicleType,
          services: selectedServices.map((service) => service.title),
        },
      })
      reset()
    } catch {
      setError(
        'Não foi possível concluir o agendamento. Tente novamente ou fale com a gente no WhatsApp.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDate = date ? new Date(`${date}T00:00:00`) : null

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader step={3} title="Contato" subtitle="Informe seus dados para agendar" />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
        className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-48 pt-4"
        noValidate
      >
        <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-sm">
          <h2 className="text-center text-base text-text-secondary">
            Informe seu WhatsApp para continuar
          </h2>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              WhatsApp <span className="text-red-500">*</span>
            </span>
            <span
              className={`flex items-center gap-2 rounded-2xl border-2 bg-surface-2 px-4 transition focus-within:border-primary/60 focus-within:bg-surface ${
                touched.phone && !phoneOk ? 'border-red-400' : 'border-transparent'
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                <span aria-hidden>🇧🇷</span>+55
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                placeholder="(00) 00000-0000"
                className="w-full bg-transparent py-3 text-sm text-text placeholder:text-lilac/80 focus:outline-none"
              />
            </span>
            {touched.phone && !phoneOk && (
              <span className="text-[11px] text-red-500">Informe um número válido com DDD.</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Nome <span className="text-red-500">*</span>
            </span>
            <input
              value={form.name}
              autoComplete="name"
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Seu nome"
              className={`w-full rounded-2xl border-2 bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-lilac/80 focus:border-primary/60 focus:bg-surface focus:outline-none ${
                touched.name && !nameOk ? 'border-red-400' : 'border-transparent'
              }`}
            />
            {touched.name && !nameOk && (
              <span className="text-[11px] text-red-500">Informe seu nome.</span>
            )}
          </label>

          {nameFound && (
            <p className="flex items-center gap-1.5 text-xs text-primary-600">
              <CheckCircle2 className="h-4 w-4" />
              Encontramos seu cadastro! Confira o nome.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Resumo do agendamento</h2>
            {vehicleType && (
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-lilac">
                {VEHICLE_LABELS[vehicleType]}
              </span>
            )}
          </div>

          <ul className="flex flex-col gap-1.5 text-sm">
            {selectedServices.map((service) => (
              <li key={service.id} className="flex justify-between gap-3">
                <span className="text-text-secondary">{service.title}</span>
                <span className="shrink-0 font-medium">
                  {getServicePriceLabel(service, vehicleType)}
                </span>
              </li>
            ))}
          </ul>

          {selectedDate && time && (
            <button
              type="button"
              onClick={() => navigate('/agendar')}
              className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-left text-sm transition hover:bg-border"
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-lilac" />
                  {capitalize(format(selectedDate, "EEE, d 'de' MMM", { locale: ptBR }))}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-lilac" />
                  {time}
                </span>
              </span>
              <Pencil className="h-3.5 w-3.5 text-text-tertiary" />
            </button>
          )}
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>

      <FlowFooter
        summary={<SelectionSummary count={selectedServices.length} totalLabel={totalLabel} />}
        onBack={() => navigate('/agendar')}
        onNext={handleSubmit}
        nextLabel={submitting ? 'Enviando...' : 'Confirmar agendamento'}
        loading={submitting}
      />
    </div>
  )
}
