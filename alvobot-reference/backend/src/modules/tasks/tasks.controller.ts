import {
  Controller,
  Post,
  Get,
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
import { TasksService } from "./tasks.service";
import { ImportTasksDto } from "./dto/import-tasks.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Tasks")
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post("import")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Importar tarefas de templates",
    description:
      "Importa tarefas pré-definidas baseadas na fase selecionada (Seu Blog no Ar, Mineração, Escala)",
  })
  @ApiResponse({
    status: 200,
    description: "Tarefas importadas com sucesso",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        count: { type: "number" },
        message: { type: "string" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Dados inválidos ou projeto não encontrado",
  })
  @ApiResponse({ status: 401, description: "Não autorizado" })
  async importTasks(@Body() dto: ImportTasksDto, @Req() req: any) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    return this.tasksService.importTasksForPhase({
      userId,
      projectId: dto.project_id,
      phase: dto.phase,
    });
  }

  @Get("phases")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Listar fases disponíveis para importação",
    description:
      "Retorna as fases disponíveis com a quantidade de tarefas em cada uma",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de fases",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          label: { type: "string" },
          taskCount: { type: "number" },
        },
      },
    },
  })
  getAvailablePhases() {
    return this.tasksService.getAvailablePhases();
  }
}
