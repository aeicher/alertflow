import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'unknown',
        slack: 'unknown', 
        openai: 'unknown'
      }
    };

    try {
      const { prisma } = await import('../../lib/prisma');
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    try {
      if (!process.env.SLACK_BOT_TOKEN) {
        health.checks.slack = 'not_configured';
      } else if (process.env.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
        health.checks.slack = 'configured';
      } else {
        health.checks.slack = 'invalid_token_format';
      }
    } catch (error) {
      health.checks.slack = 'unhealthy';
      console.error('Slack health check failed:', error);
    }

    // Check OpenAI API connectivity
    try {
      if (!process.env.OPENAI_API_KEY) {
        health.checks.openai = 'not_configured';
      } else {
        const { openai } = await import('../../lib/openai');
        await openai.models.list();
        health.checks.openai = 'healthy';
      }
    } catch (error) {
      health.checks.openai = 'unhealthy';
      console.error('OpenAI health check failed:', error);
    }

    const allChecks = Object.values(health.checks);
    const hasUnhealthy = allChecks.includes('unhealthy');
    const hasConfigured = allChecks.some(check => 
      ['healthy', 'configured', 'not_configured'].includes(check)
    );

    if (hasUnhealthy) {
      health.status = 'degraded';
    } else if (!hasConfigured) {
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 });
  }
}