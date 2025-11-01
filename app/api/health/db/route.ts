import { NextResponse } from 'next/server';
import { getDatabaseStatus } from '@/lib/db-utils';

export async function GET() {
  try {
    const status = await getDatabaseStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

