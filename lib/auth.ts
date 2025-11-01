import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-config'
import { prisma } from './prisma'

export async function getSession() {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('NEXTAUTH_SECRET is not set')
      return null
    }
    return await getServerSession(authOptions)
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export async function getUser() {
  try {
    const session = await getSession()
    return session?.user || null
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function getProfile() {
  try {
    const user = await getUser()

    if (!user?.email) return null

    const profile = await prisma.user.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return profile
  } catch (error: any) {
    console.error('Error getting profile:', error.message || error)
    
    // Handle specific Prisma connection errors
    if (error.code === 'P1001' || error.code === 'P1000' || error.message?.includes('Connection')) {
      console.error('❌ Database connection failed.')
      console.error('   Please check:')
      console.error('   1. DATABASE_URL is set in .env.local')
      console.error('   2. PostgreSQL is running')
      console.error('   3. Database exists and credentials are correct')
      throw error // Re-throw connection errors
    }
    
    // Handle schema mismatch errors (table doesn't exist)
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.error('❌ Database schema mismatch.')
      console.error('   The schema has been updated but migration hasn\'t been run.')
      console.error('   Run: npx prisma migrate dev --name add_doc_model')
      throw error // Re-throw schema errors
    }
    
    return null
  }
}
