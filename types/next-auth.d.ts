import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      username?: string
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    username?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username?: string
  }
}



