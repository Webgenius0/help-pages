import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-alternative">
        <div className="text-foreground">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

