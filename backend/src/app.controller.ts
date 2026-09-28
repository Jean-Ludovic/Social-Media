import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness: the process answers HTTP. Deliberately does not touch the database, so a
   * database outage does not make the platform restart or roll back healthy containers.
   */
  @Get('health/live')
  live() {
    return { status: 'ok', service: 'reseau-social-backend', timestamp: new Date().toISOString() };
  }

  /** Readiness: the process answers AND PostgreSQL is reachable (503 otherwise). */
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // Details stay server-side: never leak connection info to the client.
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'reseau-social-backend',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      service: 'reseau-social-backend',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
