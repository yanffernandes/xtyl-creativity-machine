import { Controller, Post, Body } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { Public } from '../../common/decorators';

interface ValidateTextDto {
  value: string;
}

@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post('project-name')
  @Public()
  validateProjectName(@Body() dto: ValidateTextDto) {
    return this.validationService.validateProjectName(dto.value);
  }

  @Post('email')
  @Public()
  validateEmail(@Body() dto: ValidateTextDto) {
    return this.validationService.validateEmail(dto.value);
  }

  @Post('workspace-name')
  @Public()
  validateWorkspaceName(@Body() dto: ValidateTextDto) {
    return this.validationService.validateWorkspaceName(dto.value);
  }

  @Post('document-title')
  @Public()
  validateDocumentTitle(@Body() dto: ValidateTextDto) {
    return this.validationService.validateDocumentTitle(dto.value);
  }
}
