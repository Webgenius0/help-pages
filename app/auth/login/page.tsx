import { Suspense } from 'react'
import LoginForm from './LoginForm'
import { LoadingSpinner } from '@/app/components/LoadingSpinner'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-alternative">
        <LoadingSpinner text="Loading..." />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

