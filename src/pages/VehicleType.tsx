import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { VEHICLE_TYPES } from '../data/vehicles'
import { useBooking } from '../context/booking-context'
import { FlowHeader } from '../components/FlowHeader'

export function VehicleType() {
  const navigate = useNavigate()
  const { vehicleType, setVehicleType } = useBooking()

  return (
    <div className="min-h-screen bg-bg text-text">
      <FlowHeader step={1} title="Tipo de veículo" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-40">
        <div className="mt-4 flex flex-col gap-1.5">
          <h1 className="text-base font-semibold">
            Qual o tipo do seu veículo?
          </h1>
          <p className="text-sm text-text-secondary">
            Os valores e serviços variam conforme o porte do veículo.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {VEHICLE_TYPES.map((option) => {
            const active = vehicleType === option.value
            const Icon = option.icon
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setVehicleType(option.value)}
                className={`flex items-center gap-4 rounded-3xl border p-4 text-left transition ${
                  active
                    ? 'border-primary/80 bg-primary/10 shadow-[0_0_70px_-35px_rgba(0,210,255,0.9)]'
                    : 'border-border bg-surface hover:border-primary/40'
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                    active
                      ? 'border-primary bg-primary text-black'
                      : 'border-primary/40 bg-primary/10 text-primary'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-xs text-text-secondary">
                    {option.description}
                  </span>
                </span>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md px-4 py-3">
          <button
            type="button"
            disabled={!vehicleType}
            onClick={() => navigate('/servicos')}
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
