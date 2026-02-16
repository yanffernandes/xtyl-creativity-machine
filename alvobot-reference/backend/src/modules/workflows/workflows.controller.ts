import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { WorkflowsService } from "./workflows.service";
import { SaveBaseStructureDto } from "./dto/save-base-structure.dto";
import { CreateProjectDto } from "./dto/create-project.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Workflows")
@Controller("workflows")
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post("base-structure")
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Inicia o workflow de salvar estrutura de base",
    description:
      "Este endpoint inicia um workflow Temporal que configura o WordPress com categorias, autor, título e logo, e salva os artigos no Supabase.",
  })
  @ApiResponse({
    status: 202,
    description: "Workflow iniciado com sucesso",
    schema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        status: { type: "string", enum: ["started", "already_exists"] },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  @ApiResponse({ status: 401, description: "Não autorizado" })
  @ApiResponse({ status: 500, description: "Erro ao iniciar workflow" })
  async startBaseStructureWorkflow(@Body() dto: SaveBaseStructureDto) {
    return this.workflowsService.startSaveBaseStructureWorkflow(dto);
  }

  @Get(":workflowId/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtém o status de um workflow",
    description: "Retorna o status atual de um workflow pelo seu ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Status do workflow",
    schema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        status: {
          type: "string",
          enum: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED", "TERMINATED"],
        },
        startTime: { type: "string", format: "date-time" },
        closeTime: { type: "string", format: "date-time", nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Não autorizado" })
  @ApiResponse({ status: 404, description: "Workflow não encontrado" })
  async getWorkflowStatus(@Param("workflowId") workflowId: string) {
    return this.workflowsService.getWorkflowStatus(workflowId);
  }

  @Get(":workflowId/result")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtém o resultado de um workflow",
    description:
      "Retorna o resultado de um workflow completo. Bloqueia até o workflow terminar.",
  })
  @ApiResponse({
    status: 200,
    description: "Resultado do workflow",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        categoriesCreated: { type: "number" },
        articlesCreated: { type: "number" },
        errors: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Não autorizado" })
  @ApiResponse({ status: 404, description: "Workflow não encontrado" })
  async getWorkflowResult(@Param("workflowId") workflowId: string) {
    return this.workflowsService.getWorkflowResult(workflowId);
  }

  @Delete(":workflowId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Cancela um workflow em execução",
    description: "Cancela um workflow que ainda está em execução.",
  })
  @ApiResponse({ status: 204, description: "Workflow cancelado" })
  @ApiResponse({ status: 401, description: "Não autorizado" })
  @ApiResponse({ status: 404, description: "Workflow não encontrado" })
  async cancelWorkflow(@Param("workflowId") workflowId: string) {
    await this.workflowsService.cancelWorkflow(workflowId);
  }

  @Post("projects")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Cria um novo projeto",
    description:
      "Valida se o domínio já existe e cria um novo projeto. Executa via Temporal workflow.",
  })
  @ApiResponse({
    status: 201,
    description: "Projeto criado com sucesso",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        project: {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" },
            domain: { type: "string" },
            status: { type: "boolean" },
          },
        },
        error: { type: "string", nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Domínio já cadastrado ou dados inválidos",
  })
  @ApiResponse({ status: 401, description: "Não autorizado" })
  @ApiResponse({ status: 500, description: "Erro ao criar projeto" })
  async createProject(@Body() dto: CreateProjectDto, @Req() req: any) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    const result = await this.workflowsService.createProject({
      userId,
      name: dto.name,
      domain: dto.domain,
      defaultLanguage: dto.defaultLanguage,
      login: dto.login || "alvobot",
    });

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return result;
  }
}
