/**
 * Short UI sounds via Web Audio API (offline, no network, < ~500ms).
 * Reads `soundEnabled` from the progress store at play time.
 */

import { useProgressStore } from '@/lib/progress/store'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

function isOn(): boolean {
  return useProgressStore.getState().soundEnabled
}

function beep(freq: number, duration: number, gain = 0.12, type: OscillatorType = 'sine') {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

function chord(freqs: number[], duration: number, gain = 0.08) {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02 + i * 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  })
}

export function playCorrect() {
  if (!isOn()) return
  beep(880, 0.11, 0.14, 'sine')
  window.setTimeout(() => beep(1174, 0.09, 0.1, 'sine'), 45)
}

export function playWrong() {
  if (!isOn()) return
  beep(180, 0.2, 0.1, 'triangle')
}

export function playLevelUp() {
  if (!isOn()) return
  beep(523, 0.1, 0.12)
  window.setTimeout(() => beep(659, 0.1, 0.12), 70)
  window.setTimeout(() => beep(784, 0.14, 0.11), 140)
}

export function playReward() {
  if (!isOn()) return
  chord([523, 659, 784], 0.22, 0.07)
}

export function playSuccess() {
  if (!isOn()) return
  beep(659, 0.12, 0.13)
  window.setTimeout(() => beep(880, 0.16, 0.11), 55)
}
