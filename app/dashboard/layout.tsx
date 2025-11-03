'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'

// Layout for dashboard routes - includes sidebar and header
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Redirect away from invalid dashboard routes
  useEffect(() => {
    if (pathname && pathname.includes('/dashboard/all-courses')) {
      router.replace('/dashboard')
    }
  }, [pathname, router])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

