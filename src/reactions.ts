import type { ReactionCounts } from './data'

export type Reaction = keyof ReactionCounts

export const REACTION_OPTIONS: { key: Reaction; icon: string; label: string }[] = [
  { key: 'heart', icon: '/icons/smiling-face-with-open-mouth_1f6030.png', label: 'Rosto sorridente' },
  { key: 'point', icon: '/icons/crying-face_1f6220.png', label: 'Rosto chorando' },
  { key: 'skull', icon: '/icons/no-entry-sign_1f6ab0.png', label: 'Sinal de proibido' },
  { key: 'dance', icon: '/icons/kiss-mark_1f48b.png', label: 'Marca de beijo' },
]

export const reactionCountLabel = (value: number) => `${value} ${value === 1 ? 'reação' : 'reações'}`

export function barPercent(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value <= 0) return 0
  return Math.min(100, Math.max(1, Math.round((value / max) * 100)))
}

export const largestValue = (values: number[]) => values.reduce((largest, value) => Number.isFinite(value) && value > largest ? value : largest, 0)
