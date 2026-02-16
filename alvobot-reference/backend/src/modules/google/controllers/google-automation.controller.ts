import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { GoogleAutomationService } from "../services/google-automation.service";
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  GetAutomationRulesQueryDto,
  AutomationRuleResponseDto,
  TestAutomationResultDto,
} from "../dto/automation-rule.dto";

/**
 * GoogleAutomationController
 * REST endpoints for automation rule management
 * T051-T053: Automation CRUD endpoints
 */
@Controller("google/automations")
@UseGuards(JwtAuthGuard)
export class GoogleAutomationController {
  constructor(private readonly automationService: GoogleAutomationService) {}

  /**
   * Get all automation rules for the current user
   * GET /google/automations/rules
   */
  @Get("rules")
  async getRules(
    @Request() req: any,
    @Query() query: GetAutomationRulesQueryDto,
  ): Promise<AutomationRuleResponseDto[]> {
    return this.automationService.getRules(
      req.user.sub,
      query.connectionId,
      query.isActive,
    );
  }

  /**
   * Get a single automation rule
   * GET /google/automations/rules/:ruleId
   */
  @Get("rules/:ruleId")
  async getRule(
    @Request() req: any,
    @Param("ruleId") ruleId: string,
  ): Promise<AutomationRuleResponseDto> {
    return this.automationService.getRule(ruleId, req.user.sub);
  }

  /**
   * Create a new automation rule
   * POST /google/automations/rules
   */
  @Post("rules")
  async createRule(
    @Request() req: any,
    @Body() dto: CreateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.automationService.createRule({
      user_id: req.user.sub,
      connection_id: dto.connectionId,
      name: dto.name,
      description: dto.description,
      scope_type: dto.scopeType,
      scope_filters: dto.scopeFilters,
      conditions: dto.conditions,
      action_type: dto.actionType,
      action_value: dto.actionValue,
      action_value_type: dto.actionValueType,
      action_limit: dto.actionLimit,
      check_frequency_minutes: dto.checkFrequencyMinutes,
      cooldown_minutes: dto.cooldownMinutes,
      max_executions: dto.maxExecutions,
    });
  }

  /**
   * Update an existing automation rule
   * PATCH /google/automations/rules/:ruleId
   */
  @Patch("rules/:ruleId")
  async updateRule(
    @Request() req: any,
    @Param("ruleId") ruleId: string,
    @Body() dto: UpdateAutomationRuleDto,
  ): Promise<AutomationRuleResponseDto> {
    return this.automationService.updateRule(ruleId, req.user.sub, {
      name: dto.name,
      description: dto.description,
      is_active: dto.isActive,
      scope_type: dto.scopeType,
      scope_filters: dto.scopeFilters,
      conditions: dto.conditions,
      action_type: dto.actionType,
      action_value: dto.actionValue,
      action_value_type: dto.actionValueType,
      action_limit: dto.actionLimit,
      check_frequency_minutes: dto.checkFrequencyMinutes,
      cooldown_minutes: dto.cooldownMinutes,
      max_executions: dto.maxExecutions,
    });
  }

  /**
   * Delete an automation rule
   * DELETE /google/automations/rules/:ruleId
   */
  @Delete("rules/:ruleId")
  async deleteRule(
    @Request() req: any,
    @Param("ruleId") ruleId: string,
  ): Promise<{ success: boolean }> {
    await this.automationService.deleteRule(ruleId, req.user.sub);
    return { success: true };
  }

  /**
   * Toggle automation rule active status
   * POST /google/automations/rules/:ruleId/toggle
   * T052: Toggle endpoint
   */
  @Post("rules/:ruleId/toggle")
  async toggleRule(
    @Request() req: any,
    @Param("ruleId") ruleId: string,
  ): Promise<AutomationRuleResponseDto> {
    return this.automationService.toggleRule(ruleId, req.user.sub);
  }

  /**
   * Test an automation rule (dry-run)
   * POST /google/automations/rules/:ruleId/test
   * T053: Test endpoint
   */
  @Post("rules/:ruleId/test")
  async testRule(
    @Request() req: any,
    @Param("ruleId") ruleId: string,
  ): Promise<TestAutomationResultDto> {
    return this.automationService.testRule(ruleId, req.user.sub);
  }

  /**
   * Execute an automation rule immediately (manual trigger)
   * POST /google/automations/rules/:ruleId/execute
   */
  @Post("rules/:ruleId/execute")
  async executeRule(
    @Request() req: any,
    @Param("ruleId") ruleId: string,
  ): Promise<{ success: boolean; executedCount: number }> {
    return this.automationService.executeRuleNow(ruleId, req.user.sub);
  }
}
