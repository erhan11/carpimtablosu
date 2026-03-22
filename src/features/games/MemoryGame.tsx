import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { parseTableQuery } from '@/lib/adaptive/adaptive'
import { useRecordAdaptiveSession } from '@/lib/adaptive/useAdaptiveSession'
import {
  factKey,
  normalizeFactKeyFromInput,
  pickQuestion,
  pickQuestionAdaptive,
  type Question,
} from '@/lib/math/questionBank'
import { shuffleInPlace } from '@/lib/math/shuffle'
import { useProgressStore, useWeakKeys } from '@/lib/progress/store'
import type { TableId } from '@/types/progress'

type CardDef = { id: string; label: string; key: string }

function buildDeck(
  unlocked: TableId[],
  weak: string[],
  locale: string,
  targetFactKey: string | null,
  tableFocus: number | undefined,
): CardDef[] {
  const qs: Question[] = []
  for (let i = 0; i < 4; i += 1) {
    qs.push(
      targetFactKey || tableFocus !== undefined
        ? pickQuestionAdaptive(unlocked, weak, targetFactKey ?? undefined, i, 4, tableFocus)
        : pickQuestion(unlocked, weak),
    )
  }
  const cards: CardDef[] = []
  for (const q of qs) {
    const k = factKey(q)
    cards.push({
      id: `${k}-q`,
      label: `${q.a} × ${q.b}`,
      key: k,
    })
    cards.push({
      id: `${k}-a`,
      label: new Intl.NumberFormat(locale).format(q.a * q.b),
      key: k,
    })
  }
  return shuffleInPlace(cards)
}

export function MemoryGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetFactKey = normalizeFactKeyFromInput(searchParams.get('fact'))
  const tableFocus = parseTableQuery(searchParams.get('table'))

  useRecordAdaptiveSession('memory', targetFactKey)

  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)

  const [deck, setDeck] = useState<CardDef[]>([])

  useEffect(() => {
    const next = buildDeck(unlocked, weak, i18n.language, targetFactKey, tableFocus)
    queueMicrotask(() => {
      setDeck(next)
    })
  }, [unlocked, weak, i18n.language, targetFactKey, tableFocus])

  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [msg, setMsg] = useState<string | null>(null)

  function onCard(c: CardDef) {
    if (matched.has(c.key)) return
    if (open.includes(c.id)) return
    if (open.length === 2) return
    if (open.length === 0) {
      setOpen([c.id])
      return
    }
    if (open.length === 1) {
      const firstId = open[0]!
      const first = deck.find((d) => d.id === firstId)
      if (!first) return
      const second = c
      const ok = first.key === second.key && first.id !== second.id
      const qParts = first.key.split('x').map(Number)
      const a = qParts[0] ?? 1
      const b = qParts[1] ?? 1
      recordAnswer({ gameId: 'memory', question: { a, b }, correct: ok })
      if (ok) {
        setMatched((m) => new Set(m).add(first.key))
        setMsg(t('games:memory.found'))
      } else {
        setMsg(t('common:feedback.tryAgain'))
      }
      setOpen([firstId, c.id])
      window.setTimeout(() => {
        setOpen([])
        setMsg(null)
      }, 700)
    }
  }

  return (
    <MainLayout title={t('games:memory.title')} showBackTo="/games">
      <div className="text-sm text-[var(--muted)]">{t('games:memory.subtitle')}</div>

      <Card className="mt-4">
        {msg ? <div className="mb-3 text-center font-extrabold text-[var(--primary-dark)]">{msg}</div> : null}
        <div className="grid grid-cols-4 gap-2">
          {deck.map((c) => {
            const faceUp = open.includes(c.id) || matched.has(c.key)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCard(c)}
                className={`min-h-[64px] rounded-2xl border-2 px-2 py-3 text-sm font-extrabold ${
                  matched.has(c.key)
                    ? 'border-[var(--success)] bg-[#e9fffb]'
                    : faceUp
                      ? 'border-[var(--primary)] bg-[#eef5ff]'
                      : 'border-[#e6edf7] bg-white'
                }`}
              >
                {faceUp ? c.label : '❓'}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="mt-4">
        <BigButton variant="ghost" onClick={() => navigate('/games')}>
          {t('games:shell.exit')}
        </BigButton>
      </div>
    </MainLayout>
  )
}
