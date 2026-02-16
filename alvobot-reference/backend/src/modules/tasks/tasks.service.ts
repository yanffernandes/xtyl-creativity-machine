import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TASK_TEMPLATES, ImportPhase, TaskTemplate } from "./task-templates";

export interface ImportTasksInput {
  userId: string;
  projectId: number;
  phase: ImportPhase;
}

export interface ImportTasksResult {
  success: boolean;
  count: number;
  message: string;
  tasks?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

@Injectable()
export class TasksService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(TasksService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Import tasks from templates based on phase
   */
  async importTasksForPhase(
    input: ImportTasksInput,
  ): Promise<ImportTasksResult> {
    const { userId, projectId, phase } = input;

    // Validate phase
    const templates = TASK_TEMPLATES[phase];
    if (!templates || templates.length === 0) {
      throw new BadRequestException(`Invalid phase: ${phase}`);
    }

    this.logger.log(
      `Importing ${templates.length} tasks for phase ${phase}, project ${projectId}`,
    );

    try {
      // Verify project exists
      // Note: Access control is handled by RLS in the frontend - if user can see the project, they can import tasks for it
      const { data: project, error: projectError } = await this.supabase
        .from("projects")
        .select("id, name, workspace_id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        throw new BadRequestException("Project not found");
      }

      // Get current max sort_order for workspace tasks (or user's tasks if no workspace)
      let sortQuery = this.supabase
        .from("tasks")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);

      if (project.workspace_id) {
        sortQuery = sortQuery.eq("workspace_id", project.workspace_id);
      } else {
        sortQuery = sortQuery.eq("user_id", userId);
      }

      const { data: existingTasks } = await sortQuery;

      const startSortOrder = (existingTasks?.[0]?.sort_order ?? -1) + 1;

      // Prepare tasks for insertion
      const tasksToInsert = templates.map(
        (template: TaskTemplate, index: number) => ({
          user_id: userId,
          project_id: projectId,
          workspace_id: project.workspace_id,
          name: template.name,
          description: template.description || null,
          status: "to_do",
          sort_order: startSortOrder + index,
          estimated_time: template.estimated_time || null,
          tags: template.tags || null,
          completion_percentage: 0,
        }),
      );

      // Insert tasks
      const { data: insertedTasks, error: insertError } = await this.supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select("id, name, status");

      if (insertError) {
        this.logger.error(`Failed to insert tasks: ${insertError.message}`);
        throw new BadRequestException(
          `Failed to import tasks: ${insertError.message}`,
        );
      }

      const count = insertedTasks?.length ?? 0;
      this.logger.log(
        `Successfully imported ${count} tasks for phase ${phase}`,
      );

      return {
        success: true,
        count,
        message: `${count} tarefa(s) importada(s) com sucesso para a fase "${this.getPhaseLabel(phase)}"`,
        tasks: insertedTasks,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error importing tasks: ${error}`);
      throw new BadRequestException("Failed to import tasks");
    }
  }

  /**
   * Get available phases with labels
   */
  getAvailablePhases(): Array<{
    value: ImportPhase;
    label: string;
    taskCount: number;
  }> {
    return [
      {
        value: "seu_blog_no_ar",
        label: "Seu Blog no Ar",
        taskCount: TASK_TEMPLATES.seu_blog_no_ar.length,
      },
      {
        value: "mineracao",
        label: "Mineração",
        taskCount: TASK_TEMPLATES.mineracao.length,
      },
      {
        value: "escala",
        label: "Escala",
        taskCount: TASK_TEMPLATES.escala.length,
      },
    ];
  }

  private getPhaseLabel(phase: ImportPhase): string {
    const labels: Record<ImportPhase, string> = {
      seu_blog_no_ar: "Seu Blog no Ar",
      mineracao: "Mineração",
      escala: "Escala",
    };
    return labels[phase] || phase;
  }
}
