// Prisma 7 configuration file
// This file is used by Prisma Migrate to read the database connection URL
import { defineConfig } from "@prisma/config";

// For prisma generate, we don't need a real connection, just a valid format
// The actual connection is handled by the adapter in lib/prisma.ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://user:password@localhost:5432/dbname?schema=public";

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
});
