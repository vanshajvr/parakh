import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useI18n, type Lang, type Messages } from '../i18n'
import { useInstallPrompt, useOnline } from '../lib/pwa'
import { Book, Calendar, Chart, Download, ReceiptIcon } from './Icons'
import { Logo } from './Logo'

const nav = (m: Messages) => [
  { to: '/', label: m.layout.nav.today, Icon: Calendar },
  { to: '/stocks', label: m.layout.nav.stocks, Icon: Chart },
  { to: '/record', label: m.layout.nav.record, short: m.layout.nav.recordShort, Icon: ReceiptIcon },
  { to: '/learn', label: m.layout.nav.learn, short: m.layout.nav.learnShort, Icon: Book },
]

// Pages translated so far (decision D-034); the rest say they're English only.
const TRANSLATED = new Set(['/', '/glossary'])

export function Layout() {
  const { lang, m } = useI18n()
  const NAV = nav(m)
  const install = useInstallPrompt()
  const online = useOnline()
  const { pathname, hash } = useLocation()

  // New page, new scroll position (in-page links like #ledger handle their own scrolling).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="min-h-dvh bg-page">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-20 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        {m.layout.skip}
      </a>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-8 px-5 lg:min-h-16 lg:px-8">
          <NavLink to="/" aria-label={m.layout.home} className="no-underline">
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
          <LanguageToggle />
          {install && (
            <button
              type="button"
              onClick={install}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink lg:h-10 lg:border-brand lg:bg-brand lg:px-4 lg:text-sm lg:text-on-brand"
            >
              <Download size={15} /> {m.layout.install}
            </button>
          )}
        </div>
      </header>

      {!online && (
        <p role="status" className="m-0 bg-chip px-5 py-2 text-center text-[13px] text-ink-2">
          {m.layout.offline}
        </p>
      )}

      <main id="main" className="mx-auto max-w-6xl px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
        {lang !== 'en' && !TRANSLATED.has(pathname) && (
          <p role="note" className="m-0 mb-4 rounded-xl bg-chip px-4 py-2.5 text-[13px] text-ink-2">{m.layout.englishOnly}</p>
        )}
        <Outlet />
        <p className="mt-8 px-1 text-xs leading-relaxed text-muted">
          <Link to="/glossary" className="font-medium no-underline">{m.layout.glossary}</Link> · {m.layout.disclaimer}
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

const LANGS: { value: Lang; label: string; name: string }[] = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'hi', label: 'हिं', name: 'हिंदी' },
]

/** English or Hindi, remembered on this device. */
function LanguageToggle() {
  const { lang, m, setLang } = useI18n()
  return (
    <div role="group" aria-label={m.layout.language} className="ml-auto flex gap-0.5 rounded-full bg-chip p-0.5">
      {LANGS.map((l) => (
        <button key={l.value} type="button" lang={l.value} aria-pressed={lang === l.value} aria-label={l.name} onClick={() => setLang(l.value)}
          className={`h-8 min-w-10 cursor-pointer rounded-full px-2.5 text-[13px] ${lang === l.value ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`}>
          {l.label}
        </button>
      ))}
    </div>
  )
}
