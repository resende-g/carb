import type { Hashtag } from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const colorClasses: Record<Hashtag['color'], string> = {
  blue: 'bg-[var(--hashtag-blue)] text-white hover:opacity-85',
  green: 'bg-[var(--hashtag-green)] text-white hover:opacity-85',
  gold: 'bg-[var(--hashtag-gold)] text-white hover:opacity-85',
  violet: 'bg-[var(--hashtag-violet)] text-white hover:opacity-85',
  red: 'bg-[var(--hashtag-red)] text-white hover:opacity-85',
  gray: 'bg-[var(--hashtag-gray)] text-white hover:opacity-85',
}

type Props = { hashtag: Hashtag; onClick?: () => void }

export function HashtagChip({ hashtag, onClick }: Props) {
  const label = `#${hashtag.name}`
  const className = cn('hashtag-chip min-h-8 rounded-full border-0 px-3 text-xs font-extrabold', colorClasses[hashtag.color])
  return onClick
    ? <Button className={className} type="button" size="sm" aria-label={`Pesquisar ${label}`} onClick={onClick}>{label}</Button>
    : <Badge className={className} aria-label={`Hashtag ${hashtag.name}`}>{label}</Badge>
}
