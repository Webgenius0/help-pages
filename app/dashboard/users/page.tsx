import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/auth'
import UsersManagementClient from './UsersManagementClient'

export default async function UsersManagementPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const profile = await getProfile()

  if (!profile) {
    redirect('/auth/login')
  }

  // Only admins can access user management
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return <UsersManagementClient />
}

