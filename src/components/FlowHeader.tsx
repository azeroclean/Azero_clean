import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const FLOW_STEPS = ['Serviços', 'Data', 'Dados', 'Confirmação'] as const

interface FlowHeaderProps {
  step: number
  title: string
  subtitle?: string
}

export function FlowHeader({ step, title, subtitle }: FlowHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-md items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight text-text">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-lilac">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-surface-2 text-text-tertiary transition hover:border-border hover:text-text"
          aria-label="Fechar agendamento"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className="mx-auto flex max-w-md items-center px-8 py-4" aria-label="Etapas">
        {FLOW_STEPS.map((label, index) => {
          const position = index + 1
          const done = position < step
          const active = position === step

          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <span
                title={label}
                aria-current={active ? 'step' : undefined}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : done
                    ? 'border-primary bg-surface text-primary'
                    : 'border-border bg-surface text-text-secondary'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : position}
              </span>
              {position < FLOW_STEPS.length && (
                <span
                  className={`mx-1 h-0.5 flex-1 rounded-full transition ${
                    done ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </header>
  )
}

interface FlowFooterProps {
  summary?: ReactNode
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  disabled?: boolean
  loading?: boolean
}

export function FlowFooter({
  summary,
  onBack,
  onNext,
  nextLabel = 'Continuar',
  disabled,
  loading,
}: FlowFooterProps) {
  const navigate = useNavigate()

  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgba(21,23,34,0.25)]">
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-3">
        {summary && <div className="text-center">{summary}</div>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink-2 active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={disabled || loading}
            className="flex h-12 flex-1 items-center justify-between rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-tertiary"
          >
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {nextLabel}
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </footer>
  )
}

export function SelectionSummary({ count, totalLabel }: { count: number; totalLabel: string }) {
  if (count === 0) {
    return <p className="text-xs text-text-tertiary">Nenhum serviço selecionado</p>
  }
  return (
    <>
      <p className="text-xs text-text-secondary">
        {count} {count === 1 ? 'serviço selecionado' : 'serviços selecionados'}
      </p>
      <p className="text-base font-bold text-text">Total previsto: {totalLabel}</p>
    </>
  )
}
