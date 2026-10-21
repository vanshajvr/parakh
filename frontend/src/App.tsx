import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { ComingSoon } from './pages/ComingSoon'
import { Today } from './pages/Today'

// Calls change once a day, so there's no need to refetch aggressively.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="stocks" element={<ComingSoon title="Stocks" />} />
            <Route path="stocks/:symbol" element={<ComingSoon title="Stock page" />} />
            <Route path="record" element={<ComingSoon title="Track record" />} />
            <Route path="learn" element={<ComingSoon title="How it works" />} />
            <Route path="*" element={<ComingSoon title="Page not found" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
