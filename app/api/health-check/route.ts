import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

interface HealthCheck {
  status: HealthStatus;
  latency?: number;
  error?: string;
  usage?: any;
}

export async function GET() {
  const startTime = Date.now();
  const healthChecks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'unknown' as HealthStatus } as HealthCheck,
      pusher: { status: 'unknown' as HealthStatus } as HealthCheck,
      memory: { status: 'unknown' as HealthStatus } as HealthCheck,
    },
    responseTime: 0,
  };

  try {
    // Check database health
    try {
      const dbHealth = await checkDatabaseHealth();
      healthChecks.checks.database = {
        status: dbHealth.status,
        latency: dbHealth.latency,
        error: dbHealth.error,
      };
    } catch (error) {
      healthChecks.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Pusher health
    try {
      if (pusherServer) {
        await pusherServer.trigger('health-check', 'ping', { timestamp: Date.now() });
      }
      healthChecks.checks.pusher = {
        status: 'healthy',
      };
    } catch (error) {
      healthChecks.checks.pusher = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    // Consider memory healthy if heap used is less than 500MB
    const isMemoryHealthy = memUsageMB.heapUsed < 500;
    healthChecks.checks.memory = {
      status: isMemoryHealthy ? 'healthy' : 'unhealthy',
      usage: memUsageMB,
    };

    // Calculate overall health
    const allChecks = Object.values(healthChecks.checks);
    const healthyChecks = allChecks.filter(check => check.status === 'healthy').length;
    const isOverallHealthy = healthyChecks === allChecks.length;

    healthChecks.responseTime = Date.now() - startTime;

    const statusCode = isOverallHealthy ? 200 : 503;
    const status = isOverallHealthy ? 'healthy' : 'unhealthy';

    return NextResponse.json(
      {
        status,
        ...healthChecks,
        summary: {
          total: allChecks.length,
          healthy: healthyChecks,
          unhealthy: allChecks.length - healthyChecks,
        },
      },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    healthChecks.responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        ...healthChecks,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
} 