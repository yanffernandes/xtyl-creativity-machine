import { Controller, Get } from '@nestjs/common';
import { SystemService } from './system.service';
import { Public } from '../../common/decorators';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('messages')
  @Public()
  async getSystemMessages() {
    return this.systemService.getActiveMessages();
  }

  @Get('status')
  @Public()
  async getSystemStatus() {
    return this.systemService.getSystemStatus();
  }
}
