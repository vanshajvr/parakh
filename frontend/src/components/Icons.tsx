import type { ReactNode } from 'react'

type IconProps = { size?: number; strokeWidth?: number; className?: string }

function Icon({ size = 20, strokeWidth = 2, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  )
}

export const ArrowUpRight = (p: IconProps) => <Icon {...p}><path d="M7 17L17 7M9 7h8v8" /></Icon>
export const ArrowDownRight = (p: IconProps) => <Icon {...p}><path d="M7 7l10 10M17 9v8H9" /></Icon>
export const Minus = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>
export const Chevron = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>
export const ChevronLeft = (p: IconProps) => <Icon {...p}><path d="M15 6l-6 6 6 6" /></Icon>
export const Info = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>
export const Download = (p: IconProps) => <Icon {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Icon>
export const Warning = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
  </Icon>
)
export const Calendar = (p: IconProps) => <Icon {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></Icon>
export const Chart = (p: IconProps) => <Icon {...p}><path d="M4 19l5-6 4 3 7-9" /></Icon>
export const ReceiptIcon = (p: IconProps) => <Icon {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon>
export const Book = (p: IconProps) => <Icon {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" /><path d="M4 21V5" /></Icon>
export const Play = (p: IconProps) => <Icon {...p}><path d="M7 4.5v15l12-7.5z" /></Icon>
export const Pause = (p: IconProps) => <Icon {...p}><path d="M8 5v14M16 5v14" /></Icon>
/** A clock with an arrow turning back: the time machine. */
export const Rewind = (p: IconProps) => <Icon {...p}><path d="M3 12a9 9 0 103-6.7M3 4v4h4" /><path d="M12 7.5V12l3 2" /></Icon>
export const Search = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Icon>
