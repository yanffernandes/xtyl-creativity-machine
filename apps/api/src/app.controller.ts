import { Controller, Get } from '@nestjs/common';
import type { AppInfo } from '@repo/shared';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): AppInfo & { status: string; timestamp: string } {
    return {
      name: 'xtyl-api',
      version: '0.0.0',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
