import { ReactNode } from 'react'

// Clean layout for public documentation routes (/docs/*)
// No header/sidebar - just the docs content
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

