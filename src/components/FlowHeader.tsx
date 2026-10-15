import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FLOW_STEPS = ['Serviços', 'Data', 'Dados'] as const

interface FlowHeaderProps {
  step: number
  onBack?: () => void
  title?: string
}

export function FlowHeader({ step, onBack, title }: FlowHeaderProps) {
  const navigate = useNavigate()
  const goBack = onBack ?? (() => navigate(-1))

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary/60 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <span className="text-xs font-medium text-text-secondary">
          {title ?? 'Agendamento'}
        </span>
        <span className="text-xs text-text-tertiary">
          Passo {step} de {FLOW_STEPS.length}
        </span>
      </div>

      <div className="mx-auto flex max-w-md items-center gap-2 px-4 pb-3">
        {FLOW_STEPS.map((label, index) => {
          const position = index + 1
          const done = position < step
          const active = position === step

          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                    active
                      ? 'text-primary'
                      : done
                      ? 'text-accent'
                      : 'text-text-tertiary'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                      active
                        ? 'border-primary bg-primary text-black'
                        : done
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border text-text-tertiary'
                    }`}
                  >
                    {done ? <Check className="h-2.5 w-2.5" /> : position}
                  </span>
                  {label}
                </div>
                <div
                  className={`h-1 rounded-full transition-all ${
                    active ? 'bg-primary' : done ? 'bg-accent' : 'bg-border'
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </header>
  )
}
