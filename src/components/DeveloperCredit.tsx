import { useEffect, useState } from 'react'
import { Camera, Code2, X } from 'lucide-react'
import { DEVELOPER } from '../data/business'

export function DeveloperCredit() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-text-tertiary transition hover:bg-surface-2 hover:text-text"
      >
        <Code2 className="h-3.5 w-3.5" />
        Feito por <span className="font-semibold text-text-secondary">{DEVELOPER.name}</span> · {DEVELOPER.role}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Sobre o desenvolvedor ${DEVELOPER.name}`}
            onClick={(event) => event.stopPropagation()}
            className="animate-fade-up relative w-full max-w-[260px] rounded-md border border-border bg-surface p-5 text-center shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded p-1 text-text-tertiary transition hover:bg-surface-2 hover:text-text"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <img
              src={DEVELOPER.photo}
              alt={`Foto de ${DEVELOPER.name}`}
              className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-primary ring-offset-2"
            />
            <p className="mt-3 text-base font-bold">{DEVELOPER.name}</p>
            <p className="text-xs text-text-secondary">{DEVELOPER.role}</p>
            <p className="mt-2 text-xs text-text-tertiary">
              Site e sistema de agendamento desenvolvidos por mim.
            </p>

            <a
              href={DEVELOPER.instagram}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-semibold text-white transition hover:bg-ink-2"
            >
              <Camera className="h-4 w-4" />
              {DEVELOPER.instagramHandle}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
