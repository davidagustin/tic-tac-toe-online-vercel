import { checkDatabaseHealth } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

interface HealthCheck {
  status: HealthStatus;
  latency?: number;
  error?: string;
  usage?: Record<string, number>;
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.checks.database = {
        status: 'unhealthy',
        error: errorMessage,
      };
    }

    // Check Pusher health - make it non-critical
    try {
      if (pusherServer) {
        // Try a simple test instead of triggering an event
        const pusherInfo = {
          appId: process.env.PUSHER_APP_ID ? 'Set' : 'Not set',
          key: process.env.NEXT_PUBLIC_PUSHER_KEY ? 'Set' : 'Not set',
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ? 'Set' : 'Not set',
        };

        // If we have the basic config, consider it healthy
        if (pusherInfo.appId === 'Set' && pusherInfo.key === 'Set' && pusherInfo.cluster === 'Set') {
          healthChecks.checks.pusher = {
            status: 'healthy',
          };
        } else {
          healthChecks.checks.pusher = {
            status: 'unhealthy',
            error: 'Missing Pusher configuration',
          };
        }
      } else {
        healthChecks.checks.pusher = {
          status: 'unhealthy',
          error: 'Pusher server not initialized',
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.checks.pusher = {
        status: 'unhealthy',
        error: errorMessage,
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

    // Calculate overall health - make Pusher non-critical
    const criticalChecks = [healthChecks.checks.database, healthChecks.checks.memory];
    const healthyCriticalChecks = criticalChecks.filter(check => check.status === 'healthy').length;
    const isOverallHealthy = healthyCriticalChecks === criticalChecks.length;

    healthChecks.responseTime = Date.now() - startTime;

    const statusCode = isOverallHealthy ? 200 : 503;
    const status = isOverallHealthy ? 'healthy' : 'unhealthy';

    return NextResponse.json(
      {
        status,
        ...healthChecks,
        summary: {
          total: Object.keys(healthChecks.checks).length,
          healthy: Object.values(healthChecks.checks).filter(check => check.status === 'healthy').length,
          unhealthy: Object.values(healthChecks.checks).filter(check => check.status === 'unhealthy').length,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    healthChecks.responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: errorMessage,
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