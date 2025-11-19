/**
 * Test database connection script
 * Run with: npx tsx scripts/test-db-connection.ts
 **/

import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔌 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Database query successful! Found ${userCount} users.`);

    // Test if tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log('✅ Available tables:', tables.map((t) => t.tablename).join(', '));
  } catch (error: any) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Solution: PostgreSQL is not running or not accessible.');
      console.error('   - Start PostgreSQL: sudo service postgresql start (Linux)');
      console.error('   - Or check if DATABASE_URL host/port is correct');
    } else if (error.code === 'P1001') {
      console.error('\n💡 Solution: Cannot reach database server.');
      console.error('   - Check if PostgreSQL is running');
      console.error('   - Verify DATABASE_URL connection string');
    } else if (error.code === 'P1000') {
      console.error('\n💡 Solution: Authentication failed.');
      console.error('   - Check database username and password in DATABASE_URL');
    } else if (error.code === 'P1003') {
      console.error('\n💡 Solution: Database does not exist.');
      console.error('   - Create the database: createdb helppages');
      console.error('   - Or update DATABASE_URL to point to an existing database');
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Connection closed.');
  }
}

testConnection();

