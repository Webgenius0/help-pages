import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Prisma Client configuration optimized for serverless environments (Vercel)
// In serverless, we need to:
// 1. Reuse the same PrismaClient instance across function invocations
// 2. Configure connection pooling for PostgreSQL
// 3. Handle connection lifecycle properly

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// In serverless environments, reuse the same PrismaClient instance
// This prevents connection exhaustion
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  // In production (Vercel), also cache the client to prevent connection issues
  // Vercel serverless functions can reuse the same container, so we want to reuse connections
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
  }
}

// Graceful shutdown (only in non-serverless environments)
// In serverless, we don't disconnect on exit to allow connection reuse
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
