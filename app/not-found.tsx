import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404: Page Not Found</h1>
        <p className="text-foreground-light mb-8">Sorry, we couldn&apos;t find that page.</p>
        <button>
          <Link href="/">Go Home</Link>
        </button>
      </div>
    </div>
  )
}
