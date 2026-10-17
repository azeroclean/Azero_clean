import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AdminAppointment } from './admin'

export const whenLabel = (apt: AdminAppointment) => {
  const day = format(new Date(`${apt.date}T00:00:00`), "EEE, d 'de' MMM", { locale: ptBR })
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} às ${apt.time}`
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

// "Plim" curto gerado no navegador (sem arquivo de áudio).
export function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {
    // navegador sem áudio: segue só com o alerta visual
  }
}

// Notificação do sistema (aparece mesmo com o painel em outra aba).
export function showSystemNotification(apt: AdminAppointment) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification('🔔 Novo agendamento para confirmar', {
      body: `${apt.client} · ${whenLabel(apt)}\n${apt.service}`,
      tag: `agendamento-${apt.id}`,
      icon: '/favicon.svg',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // alguns celulares só permitem notificação via service worker
  }
}

