'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/app/components/LoadingSpinner'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen bg-alternative flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-destructive-600">Authentication Error</CardTitle>
          <CardDescription className="text-foreground-light">
            Something went wrong during the authentication process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive-50 border border-destructive-200 rounded-md">
            <p className="text-sm text-destructive-800">{errorMessage}</p>
            {error && (
              <p className="text-xs text-destructive-600 mt-2">
                Error code: <code className="bg-destructive-100 px-1 rounded">{error}</code>
              </p>
            )}
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button asChild>
              <Link href="/auth/login">Try Again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-alternative flex items-center justify-center p-4">
        <LoadingSpinner text="Loading..." />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
