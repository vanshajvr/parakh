import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { I18nProvider } from './i18n'
import { Glossary } from './pages/Glossary'
import { Learn } from './pages/Learn'
import { PageNotFound } from './pages/PageNotFound'

import { Record } from './pages/Record'
import { Stock } from './pages/Stock'
import { Stocks } from './pages/Stocks'
import { Today } from './pages/Today'

// Calls change once a day, so there's no need to refetch aggressively.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Today />} />
              <Route path="stocks" element={<Stocks />} />
              <Route path="stocks/:symbol" element={<Stock />} />
              <Route path="record" element={<Record />} />
              <Route path="learn" element={<Learn />} />
              <Route path="glossary" element={<Glossary />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}
