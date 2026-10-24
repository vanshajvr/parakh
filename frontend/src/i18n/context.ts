import { createContext, useContext } from 'react'
import { en, type Messages } from './en'
import { hi } from './hi'

export type Lang = 'en' | 'hi'

export const MESSAGES: Record<Lang, Messages> = { en, hi }
export const STORAGE_KEY = 'parakh.lang'

type I18n = { lang: Lang; m: Messages; setLang: (lang: Lang) => void }

// English by default, so components (and tests) work without a provider.
export const I18nContext = createContext<I18n>({ lang: 'en', m: en, setLang: () => {} })

export const useI18n = () => useContext(I18nContext)
