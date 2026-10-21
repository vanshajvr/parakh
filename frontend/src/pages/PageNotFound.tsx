import { Link } from 'react-router'
import { Card } from '../components/States'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function PageNotFound() {
  useDocumentTitle('Page not found')
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h1 className="m-0 font-serif text-[28px] font-semibold">Page not found</h1>
      <p className="m-0 text-sm text-ink-2">That link doesn't lead anywhere in Parakh.</p>
      <Link to="/" className="text-sm font-medium no-underline">← Today's calls</Link>
    </Card>
  )
}
