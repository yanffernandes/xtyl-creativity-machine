import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ModelsService } from './models.service';
import { AdminGuard } from '../../common/guards';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get('text')
  async listTextModels() {
    return this.modelsService.listTextModels();
  }

  @Get('image')
  async listImageModels() {
    return this.modelsService.listImageModels();
  }

  @Get('config')
  @UseGuards(AdminGuard)
  async getModelConfig() {
    return this.modelsService.getModelConfig();
  }

  @Put('config')
  @UseGuards(AdminGuard)
  async updateModelConfig(@Body() config: Record<string, any>) {
    return this.modelsService.updateModelConfig(config);
  }
}
