import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { query, getUserStatistics, updateGameStatistics } from '@/lib/db';

// Enhanced logging function
function logTestStep(step: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[TEST_DATABASE] [${timestamp}] [${step}] ${message}`, data || '');
}

function logTestError(step: string, error: unknown, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.error(`[TEST_DATABASE] [${timestamp}] [${step}] ERROR:`, error, context || '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    if (action === 'test') {
      const result = await query('SELECT NOW() as current_time');
      return NextResponse.json({ 
        success: true, 
        message: 'Database connection successful',
        timestamp: result[0]?.current_time || new Date().toISOString()
      });
    }
    
    if (action === 'tables') {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      return NextResponse.json({ 
        success: true, 
        tables: result.map((row: { table_name: string }) => row.table_name)
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action. Use ?action=test or ?action=tables' 
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 