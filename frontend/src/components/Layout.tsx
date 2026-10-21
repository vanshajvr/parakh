import { NavLink, Outlet } from 'react-router'
import { Book, Calendar, Chart, ReceiptIcon } from './Icons'
import { Logo } from './Logo'

const NAV = [
  { to: '/', label: 'Today', Icon: Calendar },
  { to: '/stocks', label: 'Stocks', Icon: Chart },
  { to: '/record', label: 'Track record', short: 'Record', Icon: ReceiptIcon },
  { to: '/learn', label: 'How it works', short: 'Learn', Icon: Book },
]

export function Layout() {
  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-8 px-5 lg:min-h-16 lg:px-8">
          <NavLink to="/" aria-label="Parakh home" className="no-underline">
            <Logo />
          </NavLink>
          <nav aria-label="Main" className="hidden flex-1 gap-1 lg:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2.5 text-[15px] no-underline ${
                    isActive ? 'bg-chip font-semibold text-ink' : 'font-medium text-ink-2 hover:bg-chip'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
        <Outlet />
        <p className="mt-8 px-1 text-xs leading-relaxed text-muted">
          Parakh is an educational project. It is not investment advice and is not registered with SEBI.
        </p>
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden">
        {NAV.map(({ to, label, short, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 text-xs no-underline ${isActive ? 'font-semibold text-ink' : 'font-medium text-muted'}`
            }
          >
            <Icon size={22} />
            {short ?? label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
