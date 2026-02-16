import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
} from "@temporalio/client";
import {
  SaveBaseStructureInput,
  WorkflowStatus,
  CreateProjectInput,
  CreateProjectResult,
} from "../../temporal/types";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || "alvobot-tasks";

@Injectable()
export class WorkflowsService implements OnModuleDestroy {
  private client: Client | null = null;
  private connection: Connection | null = null;
  private readonly logger = new Logger(WorkflowsService.name);

  /**
   * Obtém o client do Temporal (lazy initialization)
   */
  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.logger.log(`Connecting to Temporal at ${TEMPORAL_ADDRESS}...`);

      this.connection = await Connection.connect({
        address: TEMPORAL_ADDRESS,
      });

      this.client = new Client({
        connection: this.connection,
      });

      this.logger.log("Connected to Temporal Server");
    }

    return this.client;
  }

  /**
   * Fecha a conexão ao destruir o módulo
   */
  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.client = null;
      this.logger.log("Temporal connection closed");
    }
  }

  /**
   * Inicia o workflow de salvar estrutura de base
   */
  async startSaveBaseStructureWorkflow(
    input: SaveBaseStructureInput,
  ): Promise<{ workflowId: string; status: string }> {
    const client = await this.getClient();

    // Gera um ID único para o workflow
    const workflowId = `save-base-structure-${input.projectId}-${Date.now()}`;

    try {
      const handle = await client.workflow.start("saveBaseStructureWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId,
        args: [input],
      });

      this.logger.log(
        `Started workflow ${workflowId} for project ${input.projectId}`,
      );

      return {
        workflowId: handle.workflowId,
        status: "started",
      };
    } catch (error) {
      // Se o workflow já existe, retorna o ID existente
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        this.logger.warn(`Workflow ${workflowId} already exists`);
        return {
          workflowId,
          status: "already_exists",
        };
      }

      throw error;
    }
  }

  /**
   * Obtém o status de um workflow
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const client = await this.getClient();
    const handle = client.workflow.getHandle(workflowId);

    const description = await handle.describe();

    return {
      workflowId,
      status: description.status.name as WorkflowStatus["status"],
      startTime: description.startTime,
      closeTime: description.closeTime,
    };
  }

  /**
   * Obtém o resultado de um workflow completo
   */
  async getWorkflowResult(workflowId: string): Promise<unknown> {
    const client = await this.getClient();
    const handle = client.workflow.getHandle(workflowId);

    return handle.result();
  }

  /**
   * Cancela um workflow em execução
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const client = await this.getClient();
    const handle = client.workflow.getHandle(workflowId);

    await handle.cancel();
    this.logger.log(`Cancelled workflow ${workflowId}`);
  }

  /**
   * Termina um workflow forçadamente
   */
  async terminateWorkflow(workflowId: string, reason: string): Promise<void> {
    const client = await this.getClient();
    const handle = client.workflow.getHandle(workflowId);

    await handle.terminate(reason);
    this.logger.log(`Terminated workflow ${workflowId}: ${reason}`);
  }

  /**
   * Cria um novo projeto (valida domínio e insere no banco)
   * Este workflow é síncrono - aguarda o resultado
   */
  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    const client = await this.getClient();

    // Gera um ID único para o workflow
    const workflowId = `create-project-${input.userId}-${Date.now()}`;

    try {
      const handle = await client.workflow.start("createProjectWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId,
        args: [input],
      });

      this.logger.log(`Started create project workflow ${workflowId}`);

      // Aguarda o resultado do workflow
      const result = await handle.result();

      return result as CreateProjectResult;
    } catch (error) {
      this.logger.error(`Failed to create project: ${error}`);
      throw error;
    }
  }
}
