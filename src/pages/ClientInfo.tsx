import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  User,
  Phone,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { useServices } from '../hooks/useServices'
import { useBooking } from '../context/booking-context'
import { FlowHeader } from '../components/FlowHeader'
import { createAppointment, fetchClientNameByPhone } from '../lib/services'
import { getServicePrice } from '../data/services'
import { VEHICLE_LABELS } from '../data/vehicles'

interface FormState {
  name: string
  phone: string
}

const EMPTY_FORM: FormState = { name: '', phone: '' }

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function ClientInfo() {
  const navigate = useNavigate()
  const { services } = useServices()
  const { vehicleType, selectedIds, date, time, reset } = useBooking()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
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
  const total = selectedServices.reduce(
    (acc, service) => acc + getServicePrice(service, vehicleType),
    0
  )

  useEffect(() => {
    if (submittedRef.current) return
    if (!vehicleType || selectedIds.length === 0 || !date || !time) {
      navigate('/veiculo', { replace: true })
    }
  }, [vehicleType, selectedIds.length, date, time, navigate])

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

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setError(null)

    const phoneDigits = form.phone.replace(/\D/g, '')
    if (!form.name.trim() || phoneDigits.length < 10) {
      setError('Informe seu nome e um telefone válido com DDD.')
      return
    }

    if (!vehicleType || !date || !time) {
      setError('Volte e selecione tipo de veículo, data e horário.')
      return
    }

    setSubmitting(true)

    try {
      await createAppointment({
        client_name: form.name.trim(),
        client_phone: form.phone.trim(),
        vehicle_type: vehicleType,
        service_ids: selectedIds,
        date,
        time,
        total,
      })

      const summary = {
        name: form.name.trim(),
        date,
        time,
        total,
        vehicleType,
        services: selectedServices.map((service) => service.title),
      }

      submittedRef.current = true
      navigate('/confirmacao', { replace: true, state: summary })
      reset()
    } catch {
      setError(
        'Não foi possível concluir o agendamento. Tente novamente ou fale com a gente no WhatsApp.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader step={4} title="Seus dados" />

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-40"
      >
        <div className="mt-4 flex flex-col gap-1.5">
          <h1 className="text-base font-semibold">Quase tudo pronto!</h1>
          <p className="text-sm text-text-secondary">
            Só precisamos do seu nome e telefone para confirmar.
          </p>
        </div>

        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4">
          <Field
            icon={<Phone className="h-4 w-4" />}
            label="Telefone / WhatsApp"
            value={form.phone}
            onChange={(value) => update('phone', formatPhone(value))}
            placeholder="(00) 00000-0000"
            inputMode="tel"
          />
          <Field
            icon={<User className="h-4 w-4" />}
            label="Nome completo"
            value={form.name}
            onChange={(value) => update('name', value)}
            placeholder="Seu nome"
          />
          {nameFound && (
            <p className="flex items-center gap-1.5 text-[11px] text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Encontramos seu cadastro! Confira o nome.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-3xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Resumo
            </h2>
            {vehicleType && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-primary">
                {VEHICLE_LABELS[vehicleType]}
              </span>
            )}
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {selectedServices.map((service) => (
              <li key={service.id} className="flex justify-between text-text-secondary">
                <span>{service.title}</span>
                <span>
                  {getServicePrice(service, vehicleType).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex items-center justify-between border-t border-primary/20 pt-2 text-sm">
            <span>
              {date && time
                ? `${format(new Date(`${date}T00:00:00`), 'dd/MM/yyyy')} às ${time}`
                : ''}
            </span>
            <span className="font-semibold text-primary">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-400/40 bg-red-400/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md px-4 py-3">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Confirmar agendamento
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}

interface FieldProps {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'text' | 'tel' | 'email'
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  inputMode = 'text',
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  )
}
