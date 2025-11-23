import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-config'
import { prisma } from './prisma'
import { cookies } from 'next/headers'

/**
 * Clear all session-related cookies
 */
async function clearSessionCookies(cookieStore: any) {
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ]

  cookieNames.forEach((name) => {
    try {
      cookieStore.delete(name)
    } catch (error) {
      // Ignore errors when deleting cookies
    }
  })
}

export async function getSession() {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('NEXTAUTH_SECRET is not set')
      return null
    }
    
    // Get session - Next-Auth will validate the token
    const session = await getServerSession(authOptions)
    
    // If session exists, validate that user still exists in database
    if (session?.user?.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true }
        })

        // If user doesn't exist, session is invalid - clear cookies
        if (!user) {
          const cookieStore = await cookies()
          await clearSessionCookies(cookieStore)
          return null
        }
      } catch (error) {
        // If database check fails, don't clear cookies (might be temporary DB issue)
        console.error('Error validating user exists:', error)
      }
    } else if (session === null) {
      // Session is null but we might have a cookie - clear it
      // This happens when token is invalid or expired
      try {
        const cookieStore = await cookies()
        const hasToken = cookieStore.get("next-auth.session-token")?.value ||
                        cookieStore.get("__Secure-next-auth.session-token")?.value
        
        if (hasToken) {
          // We have a token but no session - token is invalid, clear it
          await clearSessionCookies(cookieStore)
        }
      } catch (error) {
        // Ignore errors when clearing cookies
      }
    }
    
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    
    // On error, if we have a token cookie, clear it to be safe
    try {
      const cookieStore = await cookies()
      const hasToken = cookieStore.get("next-auth.session-token")?.value ||
                      cookieStore.get("__Secure-next-auth.session-token")?.value
      
      if (hasToken) {
        await clearSessionCookies(cookieStore)
      }
    } catch (clearError) {
      // Ignore errors when clearing cookies
    }
    
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
