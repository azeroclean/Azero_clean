import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AdminAppointment } from './admin'
import { isPushActive } from './push'

export const whenLabel = (apt: AdminAppointment) => {
  const day = format(new Date(`${apt.date}T00:00:00`), "EEE, d 'de' MMM", { locale: ptBR })
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} às ${apt.time}`
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

// Som de aviso gerado no navegador (sem arquivo de áudio).
// O navegador só libera som depois de um clique/toque na página, então usamos
// um único AudioContext, destravado na primeira interação (unlockAudio).
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  audioCtx = new AudioCtx()
  return audioCtx
}

export function isAudioUnlocked() {
  return audioCtx?.state === 'running'
}

// Chamar dentro de um clique/toque: libera o áudio para os avisos seguintes.
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false
  try {
    if (ctx.state !== 'running') await ctx.resume()
    // toca um silêncio curtinho: alguns navegadores (iPhone) exigem isso para destravar
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    return false
  }
  return ctx.state === 'running'
}

function tone(ctx: AudioContext, freq: number, start: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.6, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + 0.5)
}

// "Plim-plom" duas vezes
export async function playChime(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false
  try {
    if (ctx.state !== 'running') await ctx.resume()
    if (ctx.state !== 'running') return false
    const t = ctx.currentTime + 0.05
    ;[0, 0.7].forEach((offset) => {
      tone(ctx, 880, t + offset)
      tone(ctx, 1320, t + offset + 0.18)
    })
    return true
  } catch {
    // navegador sem áudio: segue só com o alerta visual
    return false
  }
}

// Notificação do sistema (aparece mesmo com o painel em outra aba).
export function showSystemNotification(apt: AdminAppointment) {
  // com push ativo, o aviso já chega pelo service worker
  if (isPushActive()) return
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

