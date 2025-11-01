import prisma from './prisma';

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await prisma.$connect();
    // Test query
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'Unknown database error',
    };
  }
}

/**
 * Get database connection status
 */
export async function getDatabaseStatus() {
  const connection = await testDatabaseConnection();
  
  if (!connection.connected) {
    return {
      status: 'error',
      message: connection.error || 'Database connection failed',
      suggestions: getSuggestions(connection.error),
    };
  }

  try {
    const userCount = await prisma.user.count();
    return {
      status: 'connected',
      userCount,
    };
  } catch (error: any) {
    return {
      status: 'connected',
      error: error.message,
    };
  }
}

function getSuggestions(error?: string): string[] {
  const suggestions: string[] = [];

  if (!process.env.DATABASE_URL) {
    suggestions.push('DATABASE_URL environment variable is not set');
    suggestions.push('Create a .env.local file with: DATABASE_URL="postgresql://user:pass@localhost:5432/helppages"');
    return suggestions;
  }

  if (error?.includes('ECONNREFUSED') || error?.includes('Connection')) {
    suggestions.push('PostgreSQL server is not running');
    suggestions.push('Start PostgreSQL: brew services start postgresql (Mac) or Start-Service postgresql-x64-XX (Windows)');
  }

  if (error?.includes('password') || error?.includes('authentication')) {
    suggestions.push('Database authentication failed');
    suggestions.push('Check username and password in DATABASE_URL');
  }

  if (error?.includes('does not exist') || error?.includes('database')) {
    suggestions.push('Database does not exist');
    suggestions.push('Create database: createdb -U postgres helppages');
  }

  return suggestions;
}

