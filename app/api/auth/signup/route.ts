import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, username, fullName } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Check if this is the first user (should be admin)
    // If there are no users yet, make this user an admin
    // Otherwise, new signups are also admins (like WordPress - first admin creates more admins)
    const userCount = await prisma.user.count()
    
    // Create user with admin role by default (like WordPress)
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullName: fullName || null,
        role: 'admin', // All new signups are admins by default
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}



