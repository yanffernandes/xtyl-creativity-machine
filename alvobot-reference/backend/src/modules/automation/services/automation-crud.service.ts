import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConnectionsService } from '../../connections/connections.service';
import { ScheduleEvaluatorService } from './schedule-evaluator.service';
import { AutomationEngineService } from './automation-engine.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  GetAutomationRulesQueryDto,
  AutomationRuleResponseDto,
  AutomationRulesListResponseDto,
  Platform,
  EntityLevel,
} from '../dto/automation-rule.dto';
import { ToggleRuleDto } from '../dto/automation-rule.dto';
import { ExecutionLogResponseDto } from '../dto/execution-log.dto';
import {
  AutomationRuleEntity,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '../entities/automation-rule.entity';
import { ExecutionLogEntity } from '../entities/execution-log.entity';
import {
  LEVELS_BY_PLATFORM,
  GOOGLE_CAMPAIGN_TYPE_OPTIONS,
} from '../constants/enums';
import { isConditionGroup, Condition, ConditionGroup } from '../dto/condition.dto';
import { FilterGroup } from '../dto/filter.dto';
import { Task } from '../dto/task.dto';

// ============================================================================
// AUTOMATION CRUD SERVICE
// ============================================================================

/**
 * AutomationCrudService
 *
 * Full CRUD operations for automation rules using Supabase service_role client.
 * Handles:
 * - Create / Update / Delete / Get / List rules
 * - Toggle rule status (active/paused)
 * - Validation (platform constraints, level compatibility, connection ownership)
 * - Entity mapping (snake_case ↔ camelCase)
 * - Cron support: getActiveRulesDue(), updateRuleExecution()
 */
@Injectable()
export class AutomationCrudService {
  private readonly logger = new Logger(AutomationCrudService.name);
  private supabase: SupabaseClient;

  private static readonly TABLE = 'automation_rules';
  private static readonly LOGS_TABLE = 'automation_execution_logs';

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => ConnectionsService))
    private connectionsService: ConnectionsService,
    private scheduleEvaluatorService: ScheduleEvaluatorService,
    @Inject(forwardRef(() => AutomationEngineService))
    private automationEngineService: AutomationEngineService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ============================================
  // CREATE
  // ============================================

  /**
   * Create a new automation rule.
   * Status defaults to 'draft'. Validates platform constraints.
   */
  async createRule(
    userId: string,
    workspaceId: string | null,
    dto: CreateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    // Validate the rule configuration
    await this.validateRuleConfig(dto);

    // Calculate next run time
    const timezone = dto.timezone || 'America/Sao_Paulo';
    const nextRunAt = this.scheduleEvaluatorService.calculateNextRun(
      dto.schedule,
      timezone,
      null,
    );

    const input: CreateAutomationRuleInput = {
      user_id: userId,
      workspace_id: workspaceId || undefined,
      name: dto.name,
      description: dto.description,
      status: dto.status || 'draft',
      platform: dto.platform,
      connection_ids: dto.connectionIds,
      ad_account_ids: dto.adAccountIds,
      google_campaign_type: dto.googleCampaignType,
      level: dto.level,
      filters: dto.filters || [],
      tasks: dto.tasks,
      schedule: dto.schedule,
      timezone,
      attribution: dto.attribution,
      notifications: dto.notifications,
    };

    const effectiveStatus = dto.status || 'draft';
    const insertData: Record<string, unknown> = {
      ...input,
      next_run_at: effectiveStatus === 'active' ? (nextRunAt?.toISOString() || null) : null,
    };

    const { data, error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create automation rule: ${error.message}`);
      throw new BadRequestException(
        `Falha ao criar regra de automação: ${error.message}`,
      );
    }

    this.logger.log(`Created automation rule "${dto.name}" (${data.id})`);
    return this.mapEntityToResponse(data as AutomationRuleEntity);
  }

  // ============================================
  // UPDATE
  // ============================================

  /**
   * Update an existing automation rule.
   * Validates ownership and platform constraints.
   */
  async updateRule(
    ruleId: string,
    userId: string,
    dto: UpdateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    // Verify ownership
    const existing = await this.getEntity(ruleId, userId);

    // If platform-related fields are changing, re-validate
    if (dto.platform || dto.level || dto.connectionIds || dto.googleCampaignType) {
      const mergedDto: CreateAutomationRuleDto = {
        name: dto.name ?? existing.name,
        platform: dto.platform ?? existing.platform,
        connectionIds: dto.connectionIds ?? existing.connection_ids,
        adAccountIds: dto.adAccountIds ?? existing.ad_account_ids,
        googleCampaignType: dto.googleCampaignType ?? existing.google_campaign_type,
        level: dto.level ?? existing.level,
        tasks: dto.tasks ?? existing.tasks,
        schedule: dto.schedule ?? existing.schedule,
        filters: dto.filters ?? existing.filters,
      };
      await this.validateRuleConfig(mergedDto);
    }

    // Build update payload (only defined fields)
    const updateData: UpdateAutomationRuleInput & { updated_at: string; next_run_at?: string | null } = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.platform !== undefined) updateData.platform = dto.platform;
    if (dto.connectionIds !== undefined) updateData.connection_ids = dto.connectionIds;
    if (dto.adAccountIds !== undefined) updateData.ad_account_ids = dto.adAccountIds;
    if (dto.googleCampaignType !== undefined) updateData.google_campaign_type = dto.googleCampaignType;
    if (dto.level !== undefined) updateData.level = dto.level;
    if (dto.filters !== undefined) updateData.filters = dto.filters;
    if (dto.tasks !== undefined) updateData.tasks = dto.tasks;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.attribution !== undefined) updateData.attribution = dto.attribution;
    if (dto.notifications !== undefined) updateData.notifications = dto.notifications;

    // Recalculate next run if schedule changed or rule is being activated
    const scheduleChanged = dto.schedule !== undefined;
    const beingActivated = dto.status === 'active' && existing.status !== 'active';
    if (scheduleChanged || beingActivated) {
      const effectiveSchedule = dto.schedule ?? existing.schedule;
      updateData.schedule = effectiveSchedule;
      const timezone = dto.timezone ?? existing.timezone;
      const lastRunAt = existing.last_run_at
        ? new Date(existing.last_run_at)
        : null;
      const nextRunAt = this.scheduleEvaluatorService.calculateNextRun(
        effectiveSchedule,
        timezone,
        lastRunAt,
      );
      updateData.next_run_at = nextRunAt?.toISOString() || null;
    }

    // Clear next_run_at when pausing or moving to draft
    if (dto.status === 'paused' || dto.status === 'draft') {
      updateData.next_run_at = null;
    }

    const { data, error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .update(updateData)
      .eq('id', ruleId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update automation rule: ${error.message}`);
      throw new BadRequestException(
        `Falha ao atualizar regra de automação: ${error.message}`,
      );
    }

    this.logger.log(`Updated automation rule ${ruleId}`);
    return this.mapEntityToResponse(data as AutomationRuleEntity);
  }

  // ============================================
  // DELETE
  // ============================================

  /**
   * Delete an automation rule and its associated execution logs.
   */
  async deleteRule(ruleId: string, userId: string): Promise<void> {
    // Verify ownership
    await this.getEntity(ruleId, userId);

    // Delete associated execution logs first
    const { error: logsError } = await this.supabase
      .from(AutomationCrudService.LOGS_TABLE)
      .delete()
      .eq('rule_id', ruleId);

    if (logsError) {
      this.logger.warn(
        `Failed to delete execution logs for rule ${ruleId}: ${logsError.message}`,
      );
    }

    // Delete associated execution tracking records
    const { error: execError } = await this.supabase
      .from('automation_executions')
      .delete()
      .eq('rule_id', ruleId);

    if (execError) {
      this.logger.warn(
        `Failed to delete execution records for rule ${ruleId}: ${execError.message}`,
      );
    }

    // Delete the rule
    const { error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .delete()
      .eq('id', ruleId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete automation rule: ${error.message}`);
      throw new BadRequestException(
        `Falha ao excluir regra de automação: ${error.message}`,
      );
    }

    this.logger.log(`Deleted automation rule ${ruleId}`);
  }

  // ============================================
  // GET SINGLE
  // ============================================

  /**
   * Get a single automation rule by ID.
   * Validates user ownership.
   */
  async getRule(
    ruleId: string,
    userId: string,
  ): Promise<AutomationRuleResponseDto> {
    const entity = await this.getEntity(ruleId, userId);
    return this.mapEntityToResponse(entity);
  }

  // ============================================
  // LIST
  // ============================================

  /**
   * List automation rules with pagination, filtering, and search.
   */
  async listRules(
    userId: string,
    workspaceId: string | null,
    query: GetAutomationRulesQueryDto,
  ): Promise<AutomationRulesListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build query
    let dbQuery = this.supabase
      .from(AutomationCrudService.TABLE)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Workspace filter
    if (workspaceId) {
      dbQuery = dbQuery.eq('workspace_id', workspaceId);
    }

    // Platform filter
    if (query.platform) {
      dbQuery = dbQuery.eq('platform', query.platform);
    }

    // Status filter
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    // Search by name
    if (query.search) {
      dbQuery = dbQuery.ilike('name', `%${query.search}%`);
    }

    // Pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      this.logger.error(`Failed to list automation rules: ${error.message}`);
      throw new BadRequestException(
        `Falha ao listar regras de automação: ${error.message}`,
      );
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      rules: (data || []).map((entity) =>
        this.mapEntityToResponse(entity as AutomationRuleEntity),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ============================================
  // TOGGLE STATUS
  // ============================================

  /**
   * Toggle a rule between 'active' and 'paused'.
   * Recalculates next_run_at when activating.
   */
  async toggleRule(
    ruleId: string,
    userId: string,
    status: 'active' | 'paused',
  ): Promise<AutomationRuleResponseDto> {
    const existing = await this.getEntity(ruleId, userId);

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // When activating, calculate next run time
    if (status === 'active') {
      const lastRunAt = existing.last_run_at
        ? new Date(existing.last_run_at)
        : null;
      const nextRunAt = this.scheduleEvaluatorService.calculateNextRun(
        existing.schedule,
        existing.timezone,
        lastRunAt,
      );
      updateData.next_run_at = nextRunAt?.toISOString() || null;
    } else {
      updateData.next_run_at = null;
    }

    const { data, error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .update(updateData)
      .eq('id', ruleId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to toggle automation rule: ${error.message}`);
      throw new BadRequestException(
        `Falha ao alterar status da regra: ${error.message}`,
      );
    }

    this.logger.log(`Toggled rule ${ruleId} to ${status}`);
    return this.mapEntityToResponse(data as AutomationRuleEntity);
  }

  // ============================================
  // MANUAL EXECUTION
  // ============================================

  /**
   * Execute a rule manually (immediate trigger).
   * - Rule can be in any status (even draft) for manual execution
   * - Does NOT update next_run_at (manual execution doesn't affect schedule)
   * - Returns the full execution log
   */
  async executeManually(
    ruleId: string,
    userId: string,
  ): Promise<ExecutionLogResponseDto> {
    // 1. Get rule by ID, verify ownership
    const entity = await this.getEntity(ruleId, userId);

    // 2. Execute via AutomationEngineService (isManual = true)
    const log = await this.automationEngineService.executeRule(entity, {
      isManual: true,
    });

    // 3. Map execution log entity to response DTO
    return this.mapExecutionLogToResponse(log, entity.name);
  }

  // ============================================
  // CRON SUPPORT
  // ============================================

  /**
   * Get all active rules that are due for execution.
   * Used by the cron job — no user filter, uses service_role.
   */
  async getActiveRulesDue(): Promise<AutomationRuleEntity[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .select('*')
      .eq('status', 'active')
      .or(`next_run_at.is.null,next_run_at.lte.${now}`);

    if (error) {
      this.logger.error(`Failed to get active rules due: ${error.message}`);
      return [];
    }

    return (data || []) as AutomationRuleEntity[];
  }

  /**
   * Update a rule's execution timestamps after a cron run.
   */
  async updateRuleExecution(
    ruleId: string,
    lastRunAt: Date,
    nextRunAt: Date | null,
  ): Promise<void> {
    const { error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .update({
        last_run_at: lastRunAt.toISOString(),
        next_run_at: nextRunAt?.toISOString() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);

    if (error) {
      this.logger.error(
        `Failed to update rule execution for ${ruleId}: ${error.message}`,
      );
    }
  }

  // ============================================
  // EXECUTION LOG QUERIES
  // ============================================

  /**
   * List execution logs with pagination and filtering.
   * Returns flat-mapped data matching the frontend ExecutionLog type.
   */
  async listExecutionLogs(
    userId: string,
    workspaceId: string | null,
    filters: {
      ruleId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    logs: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from(AutomationCrudService.LOGS_TABLE)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('executed_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (filters.ruleId) {
      query = query.eq('rule_id', filters.ruleId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to list execution logs: ${error.message}`);
      throw new BadRequestException(
        `Falha ao listar logs de execução: ${error.message}`,
      );
    }

    const total = count ?? 0;
    const logs = (data || []).map((log) =>
      this.mapExecutionLogToFlatResponse(log as ExecutionLogEntity),
    );

    return { logs, total, page, limit };
  }

  /**
   * Get a single execution log by ID.
   * Returns flat-mapped data matching the frontend ExecutionLog type.
   */
  async getExecutionLog(
    logId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from(AutomationCrudService.LOGS_TABLE)
      .select('*')
      .eq('id', logId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Log de execução não encontrado');
    }

    if (data.user_id !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este log',
      );
    }

    return this.mapExecutionLogToFlatResponse(data as ExecutionLogEntity);
  }

  // ============================================
  // PRIVATE: Entity Retrieval
  // ============================================

  /**
   * Get raw entity from database. Validates ownership.
   * @throws NotFoundException if rule not found
   * @throws ForbiddenException if user doesn't own the rule
   */
  private async getEntity(
    ruleId: string,
    userId: string,
  ): Promise<AutomationRuleEntity> {
    const { data, error } = await this.supabase
      .from(AutomationCrudService.TABLE)
      .select('*')
      .eq('id', ruleId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Regra de automação não encontrada');
    }

    if (data.user_id !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta regra',
      );
    }

    return data as AutomationRuleEntity;
  }

  // ============================================
  // PRIVATE: Validation
  // ============================================

  /**
   * Validate rule configuration based on platform constraints.
   *
   * - Google: exactly 1 connection, 1 campaign type required
   * - Meta: max 5 ad accounts, same currency recommended
   * - Level must be compatible with platform and campaign type
   * - Performance Max: only campaign or ad_account levels
   */
  private async validateRuleConfig(
    dto: CreateAutomationRuleDto,
  ): Promise<void> {
    const { platform, level, connectionIds } = dto;

    // 1. At least one connection
    if (!connectionIds || connectionIds.length === 0) {
      throw new BadRequestException(
        'É necessário pelo menos uma conexão para criar a regra',
      );
    }

    // 2. Platform-specific connection validation
    if (platform === 'google') {
      if (connectionIds.length !== 1) {
        throw new BadRequestException(
          'Google Ads requer exatamente 1 conexão por regra',
        );
      }

      if (!dto.googleCampaignType) {
        throw new BadRequestException(
          'Tipo de campanha Google é obrigatório para regras Google Ads',
        );
      }

      // Validate level against campaign type
      const campaignTypeOption = GOOGLE_CAMPAIGN_TYPE_OPTIONS.find(
        (o) => o.value === dto.googleCampaignType,
      );
      if (
        campaignTypeOption &&
        !campaignTypeOption.allowedLevels.includes(level)
      ) {
        throw new BadRequestException(
          `Nível "${level}" não é compatível com campanhas ${dto.googleCampaignType}. ` +
          `Níveis permitidos: ${campaignTypeOption.allowedLevels.join(', ')}`,
        );
      }
    }

    if (platform === 'meta') {
      if (dto.adAccountIds && dto.adAccountIds.length > 5) {
        throw new BadRequestException(
          'Meta Ads permite no máximo 5 contas de anúncio por regra',
        );
      }
    }

    // 3. Level must be valid for the platform
    const allowedLevels = LEVELS_BY_PLATFORM[platform];
    if (allowedLevels && !allowedLevels.includes(level as EntityLevel)) {
      throw new BadRequestException(
        `Nível "${level}" não é válido para a plataforma ${platform}. ` +
        `Níveis permitidos: ${allowedLevels.join(', ')}`,
      );
    }

    // 4. At least one task
    if (!dto.tasks || dto.tasks.length === 0) {
      throw new BadRequestException(
        'É necessário pelo menos uma tarefa (ação) na regra',
      );
    }

    // 5. Schedule validation
    if (!dto.schedule) {
      throw new BadRequestException('Configuração de agendamento é obrigatória');
    }

    if (dto.schedule.type === 'frequency' && !dto.schedule.checkInterval) {
      throw new BadRequestException(
        'Intervalo de verificação é obrigatório para agendamento por frequência',
      );
    }

    if (dto.schedule.type === 'custom') {
      if (!dto.schedule.customSlots || dto.schedule.customSlots.length === 0) {
        throw new BadRequestException(
          'É necessário pelo menos um slot personalizado para agendamento customizado',
        );
      }
    }

    // 6. Validate regex patterns in filters
    if (dto.filters && dto.filters.length > 0) {
      this.validateFilterRegexPatterns(dto.filters);
    }

    // 7. Performance Max restriction: explicit error message
    if (
      platform === 'google' &&
      dto.googleCampaignType === 'performance_max' &&
      !['campaign', 'ad_account'].includes(level)
    ) {
      throw new BadRequestException(
        'Campanhas Performance Max permitem apenas os níveis "campaign" e "ad_account". ' +
        'Outros níveis não são suportados para este tipo de campanha.',
      );
    }
  }

  // ============================================
  // PRIVATE: Entity Mapping
  // ============================================

  /**
   * Convert snake_case database entity to camelCase response DTO.
   * Includes computed warnings for edge cases.
   */
  private mapEntityToResponse(
    entity: AutomationRuleEntity,
  ): AutomationRuleResponseDto {
    const warnings = this.computeWarnings(entity);

    return {
      id: entity.id,
      userId: entity.user_id,
      workspaceId: entity.workspace_id,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      platform: entity.platform,
      connectionIds: entity.connection_ids,
      adAccountIds: entity.ad_account_ids,
      googleCampaignType: entity.google_campaign_type,
      level: entity.level,
      filters: entity.filters,
      tasks: entity.tasks,
      schedule: entity.schedule,
      timezone: entity.timezone,
      attribution: entity.attribution,
      notifications: entity.notifications,
      lastRunAt: entity.last_run_at,
      nextRunAt: entity.next_run_at,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  // ============================================
  // PRIVATE: Regex Validation
  // ============================================

  /**
   * Validate all regex patterns in filter groups.
   * Throws if any regex is invalid.
   */
  private validateFilterRegexPatterns(filterGroups: FilterGroup[]): void {
    for (let groupIdx = 0; groupIdx < filterGroups.length; groupIdx++) {
      const group = filterGroups[groupIdx];
      for (let filterIdx = 0; filterIdx < group.length; filterIdx++) {
        const filter = group[filterIdx];
        if (filter.operator === 'REGEX' && typeof filter.value === 'string') {
          try {
            new RegExp(filter.value);
          } catch {
            throw new BadRequestException(
              `Expressão regular inválida no filtro ${groupIdx + 1}.${filterIdx + 1}: "${filter.value}". ` +
              `Verifique a sintaxe da expressão regular.`,
            );
          }
        }
      }
    }
  }

  // ============================================
  // PRIVATE: Warnings Computation
  // ============================================

  /**
   * Derived metrics that involve division (value is 0 when denominator is 0).
   * When using < or <= operators on these, entities with 0 activity incorrectly match.
   */
  private static readonly DERIVED_METRICS = new Set([
    // Meta
    'cpm', 'cpc', 'cost_per_landing_page_view', 'purchase_roas',
    'cost_per_purchase', 'cost_per_add_to_cart', 'cost_per_initiate_checkout',
    'cost_per_lead', 'cost_per_complete_registration', 'conversion_rate',
    'cost_per_thruplay', 'hook_rate', 'hold_rate', 'cost_per_app_install',
    'ctr', 'outbound_ctr', 'frequency',
    // Google
    'average_cpc', 'cost_per_conversion', 'cost_per_interaction',
    'roas', 'video_view_rate', 'interaction_rate',
  ]);

  /**
   * Compute non-blocking warnings for a rule configuration.
   * These do NOT prevent saving but inform the user about potential issues.
   */
  private computeWarnings(entity: AutomationRuleEntity): string[] {
    const warnings: string[] = [];

    // Check for zero metric warnings in conditions
    for (let taskIdx = 0; taskIdx < entity.tasks.length; taskIdx++) {
      const task = entity.tasks[taskIdx];
      if (task.conditions) {
        this.collectZeroMetricWarnings(
          task.conditions,
          taskIdx,
          warnings,
        );
      }
    }

    return warnings;
  }

  /**
   * Recursively check condition groups for derived metrics with < or <= operators.
   * These conditions may incorrectly match entities with 0 spend/impressions
   * because the derived metric (e.g., CPA = spend/conversions) is also 0.
   */
  private collectZeroMetricWarnings(
    group: ConditionGroup,
    taskIndex: number,
    warnings: string[],
  ): void {
    if (!group || !group.conditions) return;

    for (const child of group.conditions) {
      if (isConditionGroup(child)) {
        this.collectZeroMetricWarnings(child, taskIndex, warnings);
      } else {
        const condition = child as Condition;
        if (
          condition.type === 'simple' &&
          AutomationCrudService.DERIVED_METRICS.has(condition.metric) &&
          (condition.operator === 'LESS_THAN' || condition.operator === 'LESS_THAN_OR_EQUAL')
        ) {
          warnings.push(
            `Tarefa ${taskIndex + 1}: A condição "${condition.metric} ${condition.operator === 'LESS_THAN' ? '<' : '<='} ${condition.value}" ` +
            `pode afetar entidades sem gasto/impressões (valor = 0). ` +
            `Considere adicionar um filtro de gasto mínimo ou impressões mínimas para evitar falsos positivos.`,
          );
        }
      }
    }
  }

  // ============================================
  // PRIVATE: Execution Log Mapping
  // ============================================

  /**
   * Map an ExecutionLogEntity to the response DTO.
   */
  private mapExecutionLogToResponse(
    log: ExecutionLogEntity,
    ruleName: string,
  ): ExecutionLogResponseDto {
    return {
      id: log.id,
      ruleId: log.rule_id,
      ruleName,
      userId: log.user_id,
      workspaceId: log.workspace_id,
      platform: log.platform,
      level: log.level,
      status: log.status,
      executedAt: log.executed_at,
      durationMs: log.duration_ms,
      summary: {
        entitiesEvaluated: log.summary.entities_evaluated,
        entitiesMatchedFilters: log.summary.entities_matched_filters,
        entitiesMatchedConditions: log.summary.entities_matched_conditions,
        entitiesAffected: log.summary.entities_affected,
        entitiesSkippedCap: log.summary.entities_skipped_cap,
        errorsCount: log.summary.errors_count,
      },
      affectedEntities: (log.affected_entities || []).map((ae) => ({
        entityId: ae.entity_id,
        entityName: ae.entity_name,
        entityType: ae.entity_type,
        taskIndex: ae.task_index,
        actionExecuted: ae.action_executed,
        actionParams: ae.action_params,
        previousValue: ae.previous_value,
        newValue: ae.new_value,
        metricsSnapshot: ae.metrics_snapshot,
        status: ae.status,
        error: ae.error,
      })),
      errors: (log.errors || []).map((e) => ({
        entityId: e.entity_id,
        entityName: e.entity_name,
        taskIndex: e.task_index,
        action: e.action,
        errorCode: e.error_code,
        errorMessage: e.error_message,
        retryable: e.retryable,
        timestamp: e.timestamp,
      })),
      notificationsSent: log.notifications_sent
        ? {
            emails: log.notifications_sent.emails,
            sentAt: log.notifications_sent.sent_at,
            status: log.notifications_sent.status,
            error: log.notifications_sent.error,
          }
        : undefined,
    };
  }

  // ============================================
  // PRIVATE: Flat Execution Log Mapping (for frontend)
  // ============================================

  /**
   * Map an ExecutionLogEntity to a flat response matching the frontend
   * ExecutionLog type. Summary fields are flattened to the root level.
   *
   * Frontend expects: log.entitiesEvaluated (flat)
   * Backend stores: log.summary.entities_evaluated (nested)
   */
  private mapExecutionLogToFlatResponse(
    log: ExecutionLogEntity,
  ): Record<string, unknown> {
    const summary = log.summary || ({} as Record<string, number>);

    return {
      id: log.id,
      ruleId: log.rule_id,
      userId: log.user_id,
      workspaceId: log.workspace_id,
      status: log.status,
      executedAt: log.executed_at,
      durationMs: log.duration_ms,
      // Flat summary fields (matching frontend ExecutionLog type)
      entitiesEvaluated: summary.entities_evaluated ?? 0,
      entitiesMatchedFilters: summary.entities_matched_filters ?? 0,
      entitiesMatchedConditions: summary.entities_matched_conditions ?? 0,
      entitiesAffected: summary.entities_affected ?? 0,
      entitiesSkippedCap: summary.entities_skipped_cap ?? 0,
      errorsCount: summary.errors_count ?? 0,
      // Affected entities (camelCase mapped)
      affectedEntities: (log.affected_entities || []).map((ae) => ({
        entityId: ae.entity_id,
        entityName: ae.entity_name,
        entityType: ae.entity_type,
        taskIndex: ae.task_index,
        actionExecuted: ae.action_executed,
        actionParams: ae.action_params,
        previousValue: ae.previous_value,
        newValue: ae.new_value,
        metricsSnapshot: ae.metrics_snapshot,
        status: ae.status,
        error: ae.error,
      })),
      // Errors (camelCase mapped)
      errors: (log.errors || []).map((e) => ({
        entityId: e.entity_id,
        entityName: e.entity_name,
        action: e.action,
        message: e.error_message,
        code: e.error_code,
      })),
      // Notification info
      notificationsSent: log.notifications_sent
        ? {
            emails: log.notifications_sent.emails,
            sentAt: log.notifications_sent.sent_at,
          }
        : undefined,
    };
  }
}
