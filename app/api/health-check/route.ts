import { ablyServer } from '@/lib/ably';
import { checkDatabaseHealth } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'unknown', responseTime: 0 },
      ably: { status: 'unknown', responseTime: 0 },
      memory: { status: 'unknown', usage: 0 },
    },
    responseTime: 0,
  };

  try {
    // Database health check
    const dbStart = Date.now();
    try {
      const result = await checkDatabaseHealth();
      const dbTime = Date.now() - dbStart;
      health.checks.database = {
        status: result.status,
        responseTime: dbTime,
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      health.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
      };
    }

    // Ably health check (non-critical)
    const ablyStart = Date.now();
    try {
      if (ablyServer) {
        // Try to get a channel to test connection
        const channel = ablyServer.channels.get('health-check');
        const ablyTime = Date.now() - ablyStart;
        health.checks.ably = {
          status: 'healthy',
          responseTime: ablyTime,
        };
      } else {
        health.checks.ably = {
          status: 'unhealthy',
          responseTime: Date.now() - ablyStart,
        };
      }
    } catch (error) {
      console.error('Ably health check failed:', error);
      health.checks.ably = {
        status: 'unhealthy',
        responseTime: Date.now() - ablyStart,
      };
    }

    // Memory health check
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    health.checks.memory = {
      status: memUsageMB < 512 ? 'healthy' : 'warning', // Warning if over 512MB
      usage: memUsageMB,
    };

    // Overall health determination
    const criticalChecks = [health.checks.database];
    const hasUnhealthyCritical = criticalChecks.some(check => check.status === 'unhealthy');

    if (hasUnhealthyCritical) {
      health.status = 'unhealthy';
    } else if (health.checks.ably.status === 'unhealthy') {
      // Ably failure doesn't make the entire system unhealthy
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;

    const statusCode = health.status === 'healthy' ? 200 :
      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    health.status = 'unhealthy';
    health.responseTime = Date.now() - startTime;
    return NextResponse.json(health, { status: 503 });
  }
} 