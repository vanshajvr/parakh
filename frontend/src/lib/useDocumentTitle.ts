import { useEffect } from 'react'

/** "Titan Company · Parakh", so tabs, history and screen readers name each page. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Parakh` : 'Parakh: stock signals with receipts'
  }, [title])
}
