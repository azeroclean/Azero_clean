import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AlertTriangle, Clock, Loader2, Package, Pencil, Plus, X } from 'lucide-react'
import { AdminNotice, AdminSpinner, adminButton } from '../../components/AdminScreen'
import { fetchAdminServices, saveService } from '../../lib/admin'
import type { AdminService, ServiceInput } from '../../lib/admin'
import { formatDuration, formatPrice } from '../../data/services'

const HOURS = Array.from({ length: 9 }, (_, i) => i)
const MINUTES = [0, 10, 15, 20, 30, 40, 45, 50]

const EMPTY: ServiceInput = {
  title: '',
  description: '',
  category: '',
  durationMinutes: 60,
  price: 0,
  priceMoto: null,
  priceCarro: null,
  priceCaminhonete: null,
  imageUrl: '',
  benefits: [],
  active: true,
}

const inputClass =
  'w-full rounded-xl border-2 border-transparent bg-surface-2 px-3 py-2.5 text-sm placeholder:text-text-tertiary focus:border-primary/60 focus:bg-surface focus:outline-none'

export function ServicesManager() {
  const [services, setServices] = useState<AdminService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id?: string; input: ServiceInput } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setServices(await fetchAdminServices())
    } catch (error) {
      setLoadError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminServices()
      .then((data) => !cancelled && setServices(data))
      .catch((error: Error) => !cancelled && setLoadError(error.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const toggleActive = async (service: AdminService) => {
    setTogglingId(service.id)
    setActionError(null)
    try {
      const { id, ...input } = service
      await saveService({ ...input, active: !service.active }, id)
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
    } catch (error) {
      setActionError((error as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) return <AdminSpinner label="Carregando serviços..." />

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-6">
        <AdminNotice
          icon={AlertTriangle}
          tone="danger"
          title="Erro ao carregar serviços"
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          A duração é usada para bloquear os horários que o serviço ocupa na agenda.
        </p>
        <button
          type="button"
          onClick={() => setEditing({ input: EMPTY })}
          className={`${adminButton} shrink-0 bg-primary text-white hover:bg-primary-600`}
        >
          <Plus className="h-4 w-4" />
          Novo serviço
        </button>
      </div>

      {actionError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">
          {actionError}
        </p>
      )}

      {services.length === 0 ? (
        <AdminNotice icon={Package} title="Nenhum serviço cadastrado">
          Cadastre o primeiro serviço para ele aparecer no site.
        </AdminNotice>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ${service.active ? '' : 'opacity-70'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{service.title}</p>
                  <p className="truncate text-xs text-text-tertiary">{service.category || 'Sem categoria'}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                    service.active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-surface-2 text-text-secondary ring-border'
                  }`}
                >
                  {service.active ? 'No site' : 'Oculto'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-lilac" />
                  {service.durationMinutes ? formatDuration(service.durationMinutes) : 'Sem duração'}
                </span>
                <span className="font-semibold text-text">
                  {service.price > 0 ? formatPrice(service.price) : 'A combinar'}
                </span>
              </div>
              <div className="mt-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const { id, ...input } = service
                    setEditing({ id, input })
                  }}
                  className="flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white transition hover:bg-ink-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(service)}
                  disabled={togglingId !== null}
                  className="flex h-8 items-center gap-1 rounded-full bg-surface-2 px-3 text-xs font-semibold text-text-secondary transition hover:text-text disabled:opacity-50"
                >
                  {togglingId === service.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {service.active ? 'Ocultar do site' : 'Mostrar no site'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ServiceForm
          id={editing.id}
          initial={editing.input}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      )}
    </div>
  )
}

interface ServiceFormProps {
  id?: string
  initial: ServiceInput
  onClose: () => void
  onSaved: () => void
}

function ServiceForm({ id, initial, onClose, onSaved }: ServiceFormProps) {
  const [input, setInput] = useState(initial)
  const [benefits, setBenefits] = useState(initial.benefits.join('\n'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const minutes = input.durationMinutes ?? 0
  const setDuration = (h: number, m: number) => set('durationMinutes', h * 60 + m || null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await saveService(
        { ...input, benefits: benefits.split('\n').map((b) => b.trim()).filter(Boolean) },
        id
      )
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 lg:items-center lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={id ? 'Editar serviço' : 'Novo serviço'}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-xl lg:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold">{id ? 'Editar serviço' : 'Novo serviço'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:text-text"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <Field label="Nome">
            <input
              required
              value={input.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputClass}
              placeholder="Ex.: Lavagem completa"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              rows={3}
              value={input.description}
              onChange={(e) => set('description', e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Categoria">
              <input
                value={input.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputClass}
                placeholder="Ex.: Lavagem"
              />
            </Field>
            <Field label="Tempo gasto">
              <div className="flex gap-2">
                <select
                  value={Math.floor(minutes / 60)}
                  onChange={(e) => setDuration(Number(e.target.value), minutes % 60)}
                  className={inputClass}
                  aria-label="Horas"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
                <select
                  value={minutes % 60}
                  onChange={(e) => setDuration(Math.floor(minutes / 60), Number(e.target.value))}
                  className={inputClass}
                  aria-label="Minutos"
                >
                  {[...new Set([...MINUTES, minutes % 60])].sort((a, b) => a - b).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')} min
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-text-secondary">
              Preço (R$) — deixe o tipo em branco para usar o preço base
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <PriceInput label="Base" value={input.price} onChange={(v) => set('price', v ?? 0)} required />
              <PriceInput label="Moto" value={input.priceMoto} onChange={(v) => set('priceMoto', v)} />
              <PriceInput label="Carro" value={input.priceCarro} onChange={(v) => set('priceCarro', v)} />
              <PriceInput
                label="Caminhonete"
                value={input.priceCaminhonete}
                onChange={(v) => set('priceCaminhonete', v)}
              />
            </div>
          </fieldset>

          <Field label="O que está incluso (um item por linha)">
            <textarea
              rows={3}
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Link da imagem (opcional)">
            <input
              type="url"
              value={input.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              className={inputClass}
              placeholder="https://..."
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={input.active}
              onChange={(e) => set('active', e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Mostrar no site
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className={`${adminButton} bg-surface-2 text-text-secondary hover:text-text`}
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={`${adminButton} bg-primary text-white hover:bg-primary-600`}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
      {label}
      {children}
    </label>
  )
}

function PriceInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  required?: boolean
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        required={required}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={inputClass}
      />
    </Field>
  )
}
