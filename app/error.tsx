'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
        <p className="mb-8">{error.message || 'An error occurred'}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset}>Try again</button>
          <button>
            <Link href="/">Go Home</Link>
          </button>
        </div>
      </div>
    </div>
  )
}
