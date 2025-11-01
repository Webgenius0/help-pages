import { ReactNode } from 'react'

// Separate layout for public documentation routes (/u/*)
// This layout doesn't include the Header and Sidebar - clean docs view only
export default function PublicDocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}

