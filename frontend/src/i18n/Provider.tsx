import { useEffect, useState, type ReactNode } from 'react'
import { I18nContext, MESSAGES, STORAGE_KEY, type Lang } from './context'

function storedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'hi' ? 'hi' : 'en'
  } catch {
    return 'en'
  }
}

/** The reader's language, remembered on this device and set on <html lang>. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(storedLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Private windows can refuse storage; the choice then lasts for this visit only.
    }
  }, [lang])
  return <I18nContext.Provider value={{ lang, m: MESSAGES[lang], setLang }}>{children}</I18nContext.Provider>
}
