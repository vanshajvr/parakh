import { ArrowDownRight, ArrowUpRight, Minus } from './Icons'

type Lean = 'bullish' | 'bearish' | 'no_call'

const STYLES: Record<Lean, { label: string; className: string; Icon: typeof Minus }> = {
  bullish: { label: 'Bullish lean', className: 'bg-bull-tint text-bull', Icon: ArrowUpRight },
  bearish: { label: 'Bearish lean', className: 'bg-bear-tint text-bear', Icon: ArrowDownRight },
  no_call: { label: 'No call', className: 'bg-chip text-muted', Icon: Minus },
}

export function LeanPill({ lean }: { lean: Lean }) {
  const { label, className, Icon } = STYLES[lean]
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${className}`}>
      <Icon size={14} strokeWidth={2.4} />
      {label}
    </span>
  )
}
