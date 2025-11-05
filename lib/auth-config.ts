import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error("⚠️  NEXTAUTH_SECRET is not set in .env.local");
  console.error('   Please add: NEXTAUTH_SECRET="your-secret-key-here"');
}

if (!process.env.DATABASE_URL) {
  console.error("⚠️  DATABASE_URL is not set in .env.local");
  console.error(
    '   Please add: DATABASE_URL="postgresql://user:password@localhost:5432/helppages"'
  );
}

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled due to auth plugin issue
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/error",
    newUser: "/cms",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Check if database is available
          if (!process.env.DATABASE_URL) {
            console.error("Database not configured");
            return null;
          }

          let user: any = null;
          
          try {
            user = await prisma.user.findUnique({
              where: {
                email: credentials.email,
              },
            });
          } catch (findError: any) {
            // If createdBy column doesn't exist yet, use raw SQL query
            if (findError.message?.includes("created_by") || findError.message?.includes("does not exist")) {
              const users = await (prisma as any).$queryRaw`
                SELECT id, email, username, password, full_name as "fullName"
                FROM users 
                WHERE email = ${credentials.email}
                LIMIT 1
              `;
              
              if (users.length > 0) {
                user = users[0];
              }
            } else {
              // Re-throw other errors
              throw findError;
            }
          }

          if (!user || !user.password) {
            return null;
          }

          const isCorrectPassword = await compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            username: user.username,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id;
          token.username = (user as any).username;
        }
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.username = token.username as string;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV === "development",
};
