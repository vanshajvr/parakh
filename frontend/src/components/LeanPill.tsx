import { useI18n } from '../i18n'
import { ArrowDownRight, ArrowUpRight, Minus } from './Icons'

type Lean = 'bullish' | 'bearish' | 'no_call'

const STYLES: Record<Lean, { className: string; Icon: typeof Minus }> = {
  bullish: { className: 'bg-bull-tint text-bull', Icon: ArrowUpRight },
  bearish: { className: 'bg-bear-tint text-bear', Icon: ArrowDownRight },
  no_call: { className: 'bg-chip text-muted', Icon: Minus },
}

export function LeanPill({ lean }: { lean: Lean }) {
  const { m } = useI18n()
  const { className, Icon } = STYLES[lean]
  const label = m.lean[lean]
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${className}`}>
      <Icon size={14} strokeWidth={2.4} />
      {label}
    </span>
  )
}
