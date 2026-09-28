import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

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
