import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Check, Loader2, Pencil, Volume2, VolumeX, X } from 'lucide-react'
import type { AdminAppointment } from '../../lib/admin'
import {
  isAudioUnlocked,
  playChime,
  unlockAudio,
  whenLabel as when,
} from '../../lib/notify'
import { enablePush, getPushStatus, sendTestPush } from '../../lib/push'
import type { PushStatus } from '../../lib/push'

const PUSH_LABEL: Record<PushStatus, string> = {
  unsupported: 'Este navegador não suporta notificações',
  'ios-install': 'No iPhone: Compartilhar → Adicionar à Tela de Início, abra o app e ative aqui',
  denied: 'Notificações bloqueadas: libere nas configurações do navegador para este site',
  off: 'Ativar notificações (chegam mesmo com o site fechado)',
  on: 'Notificações ativas — clique para enviar um teste',
}

// Notificações push: chegam na barra de tarefas/celular mesmo com o painel fechado.
export function NotificationToggle() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    let active = true
    getPushStatus()
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus('unsupported'))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 8000)
    return () => clearTimeout(timer)
  }, [message])

  if (status === null) return null

  const handleClick = async () => {
    if (status === 'unsupported' || status === 'denied' || status === 'ios-install') {
      setMessage({ text: PUSH_LABEL[status], tone: 'error' })
      return
    }
    setBusy(true)
    try {
      if (status === 'off') {
        await enablePush()
        setStatus('on')
        await sendTestPush().catch(() => undefined)
        setMessage({ text: 'Notificações ativadas! Enviamos um teste.', tone: 'ok' })
      } else {
        await sendTestPush()
        setMessage({ text: 'Teste enviado. Deve aparecer em alguns segundos.', tone: 'ok' })
      }
    } catch (err) {
      setMessage({ text: (err as Error).message, tone: 'error' })
      setStatus(await getPushStatus().catch(() => 'off' as const))
    } finally {
      setBusy(false)
    }
  }

  const Icon = status === 'on' ? BellRing : status === 'off' ? Bell : BellOff
  const short =
    status === 'on' ? 'Notificações ativas' : status === 'off' ? 'Ativar notificações' : 'Notificações'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={PUSH_LABEL[status]}
        aria-label={PUSH_LABEL[status]}
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-60 ${
          status === 'on'
            ? 'bg-primary/10 text-primary-600 hover:bg-primary/20'
            : status === 'off'
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'bg-surface-2 text-text-tertiary'
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span className="hidden sm:inline">{short}</span>
      </button>
      {message && (
        <p
          role="status"
          className={`absolute right-0 top-11 z-30 w-64 rounded-xl p-3 text-xs font-medium shadow-lg ${
            message.tone === 'ok' ? 'bg-ink text-white' : 'bg-red-50 text-red-700 ring-1 ring-red-200'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}

// Destrava o som no primeiro clique/toque e permite testar.
export function SoundButton() {
  const [on, setOn] = useState(isAudioUnlocked)

  useEffect(() => {
    if (on) return
    const unlock = () => {
      unlockAudio().then((ok) => ok && setOn(true))
    }
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, unlock))
  }, [on])

  const label = on ? 'Som de aviso ligado — clique para testar' : 'Clique para ligar o som de aviso'

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await unlockAudio()
        setOn(ok)
        if (ok) await playChime()
      }}
      title={label}
      aria-label={label}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
        on ? 'bg-primary/10 text-primary-600 hover:bg-primary/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
      }`}
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      <span className="hidden sm:inline">{on ? 'Testar som' : 'Ligar som'}</span>
    </button>
  )
}

export function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary"
      title={live ? 'Recebendo agendamentos em tempo real' : 'Atualizando a cada 30 segundos'}
    >
      <span className={`relative flex h-2 w-2`}>
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-primary' : 'bg-text-tertiary'}`} />
      </span>
      {live ? 'Ao vivo' : 'Atualizando'}
    </span>
  )
}

interface AlertsProps {
  alerts: AdminAppointment[]
  pendingCount: number
  busyId: string | null
  onConfirm: (apt: AdminAppointment) => void
  onEdit: (apt: AdminAppointment) => void
  onDismiss: (id: string) => void
  onShowPending: () => void
}

export function BookingAlerts({
  alerts,
  pendingCount,
  busyId,
  onConfirm,
  onEdit,
  onDismiss,
  onShowPending,
}: AlertsProps) {
  const others = pendingCount - alerts.length

  if (alerts.length === 0 && pendingCount === 0) return null

  return (
    <section className="mb-4 flex flex-col gap-2" aria-live="polite">
      {alerts.map((apt) => (
        <div
          key={apt.id}
          className="animate-fade-up flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center"
          role="alert"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
              <BellRing className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">Novo agendamento — confirme</p>
              <p className="truncate text-sm text-amber-900">
                <span className="font-semibold">{apt.client}</span> · {when(apt)}
              </p>
              <p className="truncate text-xs text-amber-800/80">{apt.service}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onConfirm(apt)}
              disabled={busyId !== null}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
            >
              {busyId === apt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => onEdit(apt)}
              disabled={busyId !== null}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-amber-800 transition hover:bg-amber-100"
              aria-label="Remarcar ou cancelar"
              title="Remarcar ou cancelar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDismiss(apt.id)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-amber-800/70 transition hover:bg-amber-100"
              aria-label="Dispensar aviso"
              title="Dispensar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {others > 0 && (
        <button
          type="button"
          onClick={onShowPending}
          className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left text-sm shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-50"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            <span>
              {alerts.length > 0 ? 'Mais ' : ''}
              <span className="font-semibold">{others}</span>{' '}
              {others === 1 ? 'agendamento aguardando' : 'agendamentos aguardando'} confirmação
            </span>
          </span>
          <span className="text-xs font-semibold text-amber-700">Ver</span>
        </button>
      )}
    </section>
  )
}
