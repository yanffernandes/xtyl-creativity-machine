import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AutomationCrudService } from './services/automation-crud.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { CustomMetricService } from './services/custom-metric.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  GetAutomationRulesQueryDto,
  AutomationRuleResponseDto,
  AutomationRulesListResponseDto,
  PreviewResultDto,
} from './dto/automation-rule.dto';
import { ToggleRuleDto } from './dto/automation-rule.dto';
import { ExecutionLogResponseDto } from './dto/execution-log.dto';
import {
  METRICS_BY_PLATFORM,
  METRIC_CATEGORIES,
  type MetricDefinition,
} from './constants/metrics';
import {
  ALL_ACTIONS,
  ACTIONS_BY_PLATFORM_LEVEL,
  type ActionDefinition,
} from './constants/actions';
import {
  FILTERABLE_FIELDS,
  type FilterFieldDefinition,
} from './constants/filters';

// ============================================================================
// AUTOMATION CONTROLLER
// ============================================================================

/**
 * AutomationController
 *
 * REST API for the unified Ads Automation Engine.
 * Supports both Google Ads and Meta Ads platforms.
 *
 * All endpoints require JWT authentication.
 * Workspace context is passed via x-workspace-id header.
 */
@ApiTags('Automations')
@ApiBearerAuth()
@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(
    private readonly crudService: AutomationCrudService,
    private readonly engineService: AutomationEngineService,
    private readonly customMetricService: CustomMetricService,
  ) {}

  // ============================================
  // RULES CRUD
  // ============================================

  /**
   * Create a new automation rule.
   * POST /automations/rules
   */
  @Post('rules')
  @ApiOperation({ summary: 'Create a new automation rule' })
  async createRule(
    @Request() req: any,
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @Body() dto: CreateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.crudService.createRule(
      req.user.sub,
      workspaceId || null,
      dto,
    );
  }

  /**
   * List automation rules with pagination and filtering.
   * GET /automations/rules
   */
  @Get('rules')
  @ApiOperation({ summary: 'List automation rules' })
  async listRules(
    @Request() req: any,
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @Query() query: GetAutomationRulesQueryDto,
  ): Promise<AutomationRulesListResponseDto> {
    return this.crudService.listRules(
      req.user.sub,
      workspaceId || null,
      query,
    );
  }

  /**
   * Get a single automation rule by ID.
   * GET /automations/rules/:id
   */
  @Get('rules/:id')
  @ApiOperation({ summary: 'Get automation rule details' })
  async getRule(
    @Request() req: any,
    @Param('id') ruleId: string,
  ): Promise<AutomationRuleResponseDto> {
    return this.crudService.getRule(ruleId, req.user.sub);
  }

  /**
   * Update an existing automation rule.
   * PATCH /automations/rules/:id
   */
  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update an automation rule' })
  async updateRule(
    @Request() req: any,
    @Param('id') ruleId: string,
    @Body() dto: UpdateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.crudService.updateRule(ruleId, req.user.sub, dto);
  }

  /**
   * Delete an automation rule.
   * DELETE /automations/rules/:id
   */
  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an automation rule' })
  async deleteRule(
    @Request() req: any,
    @Param('id') ruleId: string,
  ): Promise<void> {
    await this.crudService.deleteRule(ruleId, req.user.sub);
  }

  /**
   * Toggle a rule's status (active/paused).
   * POST /automations/rules/:id/toggle
   */
  @Post('rules/:id/toggle')
  @ApiOperation({ summary: 'Toggle rule status (active/paused)' })
  async toggleRule(
    @Request() req: any,
    @Param('id') ruleId: string,
    @Body() dto: ToggleRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.crudService.toggleRule(ruleId, req.user.sub, dto.status);
  }

  // ============================================
  // PREVIEW & EXECUTE
  // ============================================

  /**
   * Preview which entities would be affected by a rule (dry-run).
   * POST /automations/rules/:id/preview
   *
   * Returns matching entities, summary counts, and any warnings
   * (e.g., when entity count exceeds the processing limit).
   */
  @Post('rules/:id/preview')
  @ApiOperation({ summary: 'Preview rule execution (dry-run)' })
  async previewRule(
    @Request() req: any,
    @Param('id') ruleId: string,
  ): Promise<PreviewResultDto> {
    // Verify rule exists and user owns it (returns DTO, but we need the entity)
    const ruleDto = await this.crudService.getRule(ruleId, req.user.sub);

    // Build a minimal entity from the DTO for the engine
    // The engine's previewRule expects AutomationRuleEntity (snake_case)
    const ruleEntity = this.mapDtoToEntity(ruleDto);

    return this.engineService.previewRule(ruleEntity);
  }

  /**
   * Execute a rule immediately (manual trigger).
   * POST /automations/rules/:id/execute
   *
   * - Rule can be in any status (even draft) for manual execution
   * - Manual execution does NOT affect the schedule (next_run_at is preserved)
   * - Returns the full execution log with summary and affected entities
   */
  @Post('rules/:id/execute')
  @ApiOperation({ summary: 'Execute rule immediately (manual trigger)' })
  async executeRule(
    @Request() req: any,
    @Param('id') ruleId: string,
  ): Promise<ExecutionLogResponseDto> {
    return this.crudService.executeManually(ruleId, req.user.sub);
  }

  // ============================================
  // EXECUTION LOGS
  // ============================================

  /**
   * List execution logs with pagination and filtering.
   * GET /automations/logs
   */
  @Get('logs')
  @ApiOperation({ summary: 'List execution logs' })
  async listLogs(
    @Request() req: any,
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.crudService.listExecutionLogs(
      req.user.sub,
      workspaceId || null,
      { ruleId, status, page, limit },
    );
  }

  /**
   * Get a single execution log entry with full details.
   * GET /automations/logs/:id
   */
  @Get('logs/:id')
  @ApiOperation({ summary: 'Get execution log details' })
  async getLog(
    @Request() req: any,
    @Param('id') logId: string,
  ) {
    return this.crudService.getExecutionLog(logId, req.user.sub);
  }

  // ============================================
  // METRICS METADATA
  // ============================================

  /**
   * Get available metrics, actions, and filter fields for a platform + level.
   * Used by the frontend to populate rule builder dropdowns.
   * GET /automations/metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get available metrics and actions metadata' })
  async getMetricsMetadata(
    @Query('platform') platform?: 'google' | 'meta',
    @Query('level') level?: string,
  ): Promise<{
    metrics: Record<string, MetricDefinition[]>;
    actions: Record<string, Record<string, ActionDefinition[]>>;
    filters: Record<string, Record<string, FilterFieldDefinition[]>>;
    categories: readonly string[];
  }> {
    // If a specific platform is requested, return only that platform's data
    const metricsResult: Record<string, MetricDefinition[]> = {};
    const actionsResult: Record<string, Record<string, ActionDefinition[]>> = {};
    const filtersResult: Record<string, Record<string, FilterFieldDefinition[]>> = {};

    const platforms = platform ? [platform] : (['google', 'meta'] as const);

    for (const p of platforms) {
      metricsResult[p] = METRICS_BY_PLATFORM[p];

      // Build actions by level
      const actionsByLevel: Record<string, ActionDefinition[]> = {};
      const platformActions = ACTIONS_BY_PLATFORM_LEVEL[p];
      if (platformActions) {
        const levels = level ? [level] : Object.keys(platformActions);
        for (const l of levels) {
          const slugs = platformActions[l] ?? [];
          actionsByLevel[l] = ALL_ACTIONS.filter((a) =>
            slugs.includes(a.slug),
          );
        }
      }
      actionsResult[p] = actionsByLevel;

      // Build filters by level
      const filtersByLevel: Record<string, FilterFieldDefinition[]> = {};
      const platformFilters = FILTERABLE_FIELDS[p];
      if (platformFilters) {
        const levels = level ? [level] : Object.keys(platformFilters);
        for (const l of levels) {
          filtersByLevel[l] = platformFilters[l] ?? [];
        }
      }
      filtersResult[p] = filtersByLevel;
    }

    return {
      metrics: metricsResult,
      actions: actionsResult,
      filters: filtersResult,
      categories: METRIC_CATEGORIES,
    };
  }

  // ============================================
  // CUSTOM METRICS
  // ============================================

  /**
   * Create a custom metric (formula).
   * POST /automations/custom-metrics
   *
   * TODO: Delegate to CustomMetricService when implemented
   */
  @Post('custom-metrics')
  @ApiOperation({ summary: 'Create a custom metric' })
  async createCustomMetric(
    @Request() _req: any,
    @Body() _body: Record<string, unknown>,
  ): Promise<{ message: string }> {
    // TODO: Implement via CustomMetricService
    return { message: 'Custom metrics not yet implemented. Coming in Phase 11.' };
  }

  /**
   * List custom metrics for the user/workspace.
   * GET /automations/custom-metrics
   *
   * TODO: Delegate to CustomMetricService when implemented
   */
  @Get('custom-metrics')
  @ApiOperation({ summary: 'List custom metrics' })
  async listCustomMetrics(
    @Request() _req: any,
  ): Promise<{ message: string }> {
    // TODO: Implement via CustomMetricService
    return { message: 'Custom metrics not yet implemented. Coming in Phase 11.' };
  }

  /**
   * Delete a custom metric.
   * DELETE /automations/custom-metrics/:id
   *
   * TODO: Delegate to CustomMetricService when implemented
   */
  @Delete('custom-metrics/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom metric' })
  async deleteCustomMetric(
    @Request() _req: any,
    @Param('id') _metricId: string,
  ): Promise<void> {
    // TODO: Implement via CustomMetricService
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Map a response DTO back to a database entity shape.
   * Used when the engine needs the entity format but we only have the DTO.
   */
  private mapDtoToEntity(dto: AutomationRuleResponseDto): import('./entities/automation-rule.entity').AutomationRuleEntity {
    return {
      id: dto.id,
      user_id: dto.userId,
      workspace_id: dto.workspaceId,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      platform: dto.platform,
      connection_ids: dto.connectionIds,
      ad_account_ids: dto.adAccountIds,
      google_campaign_type: dto.googleCampaignType,
      level: dto.level,
      filters: dto.filters,
      tasks: dto.tasks,
      schedule: dto.schedule,
      timezone: dto.timezone,
      attribution: dto.attribution,
      notifications: dto.notifications,
      last_run_at: dto.lastRunAt,
      next_run_at: dto.nextRunAt,
      created_at: dto.createdAt,
      updated_at: dto.updatedAt,
    };
  }
}
