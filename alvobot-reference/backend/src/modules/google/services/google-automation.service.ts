import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleAdsApiService } from "./google-ads-api.service";
import { GoogleDashboardService } from "./google-dashboard.service";
import {
  AutomationRule,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "../entities/automation-rule.entity";
import {
  ConditionTree,
  ConditionGroup,
  Condition,
  ScopeFilters,
  MetricType,
  AutomationRuleResponseDto,
  TestAutomationResultDto,
} from "../dto/automation-rule.dto";
import {
  CampaignMetricsDto,
  DashboardPeriod,
} from "../dto/campaign-metrics.dto";
import {
  GoogleConnection,
  isGoogleConnection,
} from "../entities/google-connection.entity";
import { ConnectionsService } from "../../connections/connections.service";
import { CircuitBreakerService } from "../../connections/circuit-breaker.service";

/**
 * GoogleAutomationService
 * Handles CRUD operations for automation rules and executes automations
 * T046-T050: Automation service implementation
 */
@Injectable()
export class GoogleAutomationService {
  private readonly logger = new Logger(GoogleAutomationService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private googleAdsApiService: GoogleAdsApiService,
    private googleDashboardService: GoogleDashboardService,
    @Inject(forwardRef(() => ConnectionsService))
    private connectionsService: ConnectionsService,
    @Inject(forwardRef(() => CircuitBreakerService))
    private circuitBreakerService: CircuitBreakerService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ============================================
  // CRUD Operations (T046)
  // ============================================

  /**
   * Get all automation rules for a user
   */
  async getRules(
    userId: string,
    connectionId?: string,
    isActive?: boolean,
  ): Promise<AutomationRuleResponseDto[]> {
    let query = this.supabase
      .from("google_ads_automation_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (connectionId) {
      query = query.eq("connection_id", connectionId);
    }

    if (isActive !== undefined) {
      query = query.eq("is_active", isActive);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to get automation rules: ${error.message}`);
      throw new Error("Failed to get automation rules");
    }

    return (data || []).map(this.mapToResponseDto);
  }

  /**
   * Get a single automation rule by ID
   */
  async getRule(
    ruleId: string,
    userId: string,
  ): Promise<AutomationRuleResponseDto> {
    const { data, error } = await this.supabase
      .from("google_ads_automation_rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Automation rule not found");
    }

    return this.mapToResponseDto(data);
  }

  /**
   * Create a new automation rule
   */
  async createRule(
    input: CreateAutomationRuleInput,
  ): Promise<AutomationRuleResponseDto> {
    const { data, error } = await this.supabase
      .from("google_ads_automation_rules")
      .insert({
        user_id: input.user_id,
        connection_id: input.connection_id,
        name: input.name,
        description: input.description,
        is_active: true,
        scope_type: input.scope_type || "all",
        scope_filters: input.scope_filters,
        conditions: input.conditions,
        action_type: input.action_type,
        action_value: input.action_value,
        action_value_type: input.action_value_type,
        action_limit: input.action_limit,
        check_frequency_minutes: input.check_frequency_minutes || 60,
        cooldown_minutes: input.cooldown_minutes || 360,
        max_executions: input.max_executions,
        current_executions: 0,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create automation rule: ${error.message}`);
      throw new Error("Failed to create automation rule");
    }

    return this.mapToResponseDto(data);
  }

  /**
   * Update an existing automation rule
   */
  async updateRule(
    ruleId: string,
    userId: string,
    input: UpdateAutomationRuleInput,
  ): Promise<AutomationRuleResponseDto> {
    // First verify the rule exists and belongs to user
    await this.getRule(ruleId, userId);

    const updateData: Record<string, any> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.scope_type !== undefined)
      updateData.scope_type = input.scope_type;
    if (input.scope_filters !== undefined)
      updateData.scope_filters = input.scope_filters;
    if (input.conditions !== undefined)
      updateData.conditions = input.conditions;
    if (input.action_type !== undefined)
      updateData.action_type = input.action_type;
    if (input.action_value !== undefined)
      updateData.action_value = input.action_value;
    if (input.action_value_type !== undefined)
      updateData.action_value_type = input.action_value_type;
    if (input.action_limit !== undefined)
      updateData.action_limit = input.action_limit;
    if (input.check_frequency_minutes !== undefined)
      updateData.check_frequency_minutes = input.check_frequency_minutes;
    if (input.cooldown_minutes !== undefined)
      updateData.cooldown_minutes = input.cooldown_minutes;
    if (input.max_executions !== undefined)
      updateData.max_executions = input.max_executions;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("google_ads_automation_rules")
      .update(updateData)
      .eq("id", ruleId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update automation rule: ${error.message}`);
      throw new Error("Failed to update automation rule");
    }

    return this.mapToResponseDto(data);
  }

  /**
   * Delete an automation rule
   */
  async deleteRule(ruleId: string, userId: string): Promise<void> {
    // First verify the rule exists and belongs to user
    await this.getRule(ruleId, userId);

    // Delete associated executions first
    await this.supabase
      .from("google_ads_automation_executions")
      .delete()
      .eq("automation_rule_id", ruleId);

    const { error } = await this.supabase
      .from("google_ads_automation_rules")
      .delete()
      .eq("id", ruleId)
      .eq("user_id", userId);

    if (error) {
      this.logger.error(`Failed to delete automation rule: ${error.message}`);
      throw new Error("Failed to delete automation rule");
    }
  }

  /**
   * Toggle automation rule active status
   */
  async toggleRule(
    ruleId: string,
    userId: string,
  ): Promise<AutomationRuleResponseDto> {
    const rule = await this.getRule(ruleId, userId);
    return this.updateRule(ruleId, userId, { is_active: !rule.isActive });
  }

  // ============================================
  // Condition Evaluation (T047)
  // ============================================

  /**
   * Evaluate a condition tree against campaign metrics
   * Supports AND/OR groups with nesting
   */
  evaluateConditions(
    conditions: ConditionTree,
    metrics: CampaignMetricsDto,
  ): boolean {
    this.logger.log(`evaluateConditions: type=${conditions.type}`);

    if (conditions.type === "condition") {
      return this.evaluateSingleCondition(conditions as Condition, metrics);
    }

    const group = conditions as ConditionGroup;
    this.logger.log(
      `evaluateConditions: group operator=${group.operator}, children count=${group.children?.length || 0}`,
    );

    if (!group.children || group.children.length === 0) {
      this.logger.log(`evaluateConditions: no children, returning true`);
      return true;
    }

    const results = group.children.map((child) =>
      this.evaluateConditions(child, metrics),
    );

    this.logger.log(
      `evaluateConditions: children results=${JSON.stringify(results)}`,
    );

    if (group.operator === "AND") {
      return results.every((r) => r);
    } else {
      // OR
      return results.some((r) => r);
    }
  }

  /**
   * Evaluate a single condition against metrics
   */
  private evaluateSingleCondition(
    condition: Condition,
    metrics: CampaignMetricsDto,
  ): boolean {
    const metricValue = this.getMetricValue(condition.metric, metrics);
    const { operator, value } = condition;

    this.logger.log(
      `evaluateSingleCondition: metric=${condition.metric}, operator=${operator}, value=${value} (type: ${typeof value}), metricValue=${metricValue} (type: ${typeof metricValue})`,
    );

    // Ensure value is a number
    const numericValue =
      typeof value === "string" ? parseFloat(value) : Number(value);

    let result: boolean;
    switch (operator) {
      case ">":
        result = metricValue > numericValue;
        break;
      case "<":
        result = metricValue < numericValue;
        break;
      case ">=":
        result = metricValue >= numericValue;
        break;
      case "<=":
        result = metricValue <= numericValue;
        break;
      case "==":
        result = metricValue === numericValue;
        break;
      case "!=":
        result = metricValue !== numericValue;
        break;
      default:
        result = false;
    }

    this.logger.log(`evaluateSingleCondition result: ${result}`);
    return result;
  }

  /**
   * Get metric value from campaign metrics
   */
  private getMetricValue(
    metric: MetricType,
    metrics: CampaignMetricsDto,
  ): number {
    switch (metric) {
      case "impressions":
        return metrics.impressions;
      case "clicks":
        return metrics.clicks;
      case "ctr":
        return metrics.ctr;
      case "cost":
        return metrics.cost;
      case "conversions":
        return metrics.conversions;
      case "cpa":
        return metrics.cpa;
      case "roas":
        return metrics.roas || 0;
      case "budget_spent_percent":
        return metrics.budgetSpentPercent;
      case "runtime_hours":
        // Calculate from campaign start (if available)
        // For now, return 0 as this would need campaign creation date
        return 0;
      default:
        return 0;
    }
  }

  // ============================================
  // Action Execution (T048)
  // ============================================

  /**
   * Execute automation action on a campaign
   */
  async executeAction(
    rule: AutomationRule,
    campaign: CampaignMetricsDto,
    connection: GoogleConnection,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.log(
      `Executing action ${rule.action_type} for campaign ${campaign.id} (rule: ${rule.name}), budget: ${campaign.budget}, budgetId: ${campaign.budgetId}`,
    );

    try {
      let result: { success: boolean; error?: string };

      switch (rule.action_type) {
        case "pause":
          result = await this.googleDashboardService.pauseCampaign(
            userId,
            rule.connection_id,
            campaign.id,
          );
          break;

        case "enable":
          result = await this.googleDashboardService.enableCampaign(
            userId,
            rule.connection_id,
            campaign.id,
          );
          break;

        case "increase_budget":
        case "decrease_budget":
          result = await this.executeBudgetAction(rule, campaign, userId);
          break;

        case "increase_bid":
        case "decrease_bid":
          result = await this.executeBidAction(rule, campaign, userId);
          break;

        case "increase_target_cpa":
        case "decrease_target_cpa":
          result = await this.executeTargetCpaAction(rule, campaign, userId);
          break;

        case "increase_target_roas":
        case "decrease_target_roas":
          result = await this.executeTargetRoasAction(rule, campaign, userId);
          break;

        default:
          result = {
            success: false,
            error: `Unknown action type: ${rule.action_type}`,
          };
      }

      // Log the result from the action
      this.logger.log(
        `executeAction: action ${rule.action_type} result: ${JSON.stringify(result)}`,
      );

      // Update execution tracking
      if (result.success) {
        this.logger.log(
          `executeAction: action succeeded, recording execution...`,
        );
        await this.recordExecution(rule.id, campaign.id);
        await this.updateRuleExecutionCount(rule.id);
      } else {
        this.logger.warn(`executeAction: action failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to execute action: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute budget increase/decrease action
   */
  private async executeBudgetAction(
    rule: AutomationRule,
    campaign: CampaignMetricsDto,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!rule.action_value) {
      this.logger.warn(
        `executeBudgetAction: action_value not specified for rule ${rule.id}`,
      );
      return { success: false, error: "Action value not specified" };
    }

    const currentBudget = campaign.budget;
    let newBudget: number;

    if (rule.action_value_type === "percentage") {
      const changeAmount = currentBudget * (rule.action_value / 100);
      newBudget =
        rule.action_type === "increase_budget"
          ? currentBudget + changeAmount
          : currentBudget - changeAmount;
    } else {
      // Absolute value
      newBudget =
        rule.action_type === "increase_budget"
          ? currentBudget + rule.action_value
          : currentBudget - rule.action_value;
    }

    this.logger.log(
      `executeBudgetAction: currentBudget=${currentBudget}, newBudget=${newBudget}, action_value=${rule.action_value}, action_value_type=${rule.action_value_type}`,
    );

    // Apply limit if specified
    if (rule.action_limit) {
      if (rule.action_type === "increase_budget") {
        newBudget = Math.min(newBudget, rule.action_limit);
      } else {
        newBudget = Math.max(newBudget, rule.action_limit);
      }
      this.logger.log(
        `executeBudgetAction: after limit applied, newBudget=${newBudget}`,
      );
    }

    // Ensure budget doesn't go below 0
    newBudget = Math.max(newBudget, 0);

    if (newBudget === currentBudget) {
      this.logger.log(
        `executeBudgetAction: no change needed (${currentBudget} === ${newBudget})`,
      );
      return { success: true }; // No change needed
    }

    if (!campaign.budgetId) {
      this.logger.warn(
        `executeBudgetAction: budgetId not found for campaign ${campaign.id}`,
      );
      return { success: false, error: "Budget ID not found for campaign" };
    }

    this.logger.log(
      `executeBudgetAction: calling updateBudget for campaign ${campaign.id}, budgetId=${campaign.budgetId}, newBudget=${newBudget}, customerId=${campaign.customerId}, loginCustomerId=${campaign.loginCustomerId}`,
    );

    try {
      const result = await this.googleDashboardService.updateBudget(
        userId,
        rule.connection_id,
        campaign.id,
        campaign.budgetId,
        newBudget,
        campaign.customerId,
        campaign.loginCustomerId,
      );
      this.logger.log(
        `executeBudgetAction: updateBudget returned: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `executeBudgetAction: updateBudget threw an error: ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute bid increase/decrease action
   */
  private async executeBidAction(
    rule: AutomationRule,
    campaign: CampaignMetricsDto,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!rule.action_value) {
      this.logger.warn(
        `executeBidAction: action_value not specified for rule ${rule.id}`,
      );
      return { success: false, error: "Action value not specified" };
    }

    // Get current bid from campaign (maxBid field, or default to 1.00)
    const currentBid = (campaign as any).maxBid || 1.0;
    let newBid: number;

    if (rule.action_value_type === "percentage") {
      const changeAmount = currentBid * (rule.action_value / 100);
      newBid =
        rule.action_type === "increase_bid"
          ? currentBid + changeAmount
          : currentBid - changeAmount;
    } else {
      // Absolute value
      newBid =
        rule.action_type === "increase_bid"
          ? currentBid + rule.action_value
          : currentBid - rule.action_value;
    }

    this.logger.log(
      `executeBidAction: currentBid=${currentBid}, newBid=${newBid}, action_value=${rule.action_value}, action_value_type=${rule.action_value_type}`,
    );

    // Apply limit if specified
    if (rule.action_limit) {
      if (rule.action_type === "increase_bid") {
        newBid = Math.min(newBid, rule.action_limit);
      } else {
        newBid = Math.max(newBid, rule.action_limit);
      }
      this.logger.log(
        `executeBidAction: after limit applied, newBid=${newBid}`,
      );
    }

    // Ensure bid doesn't go below minimum (0.01)
    newBid = Math.max(newBid, 0.01);
    // Round to 2 decimal places
    newBid = Math.round(newBid * 100) / 100;

    if (newBid === currentBid) {
      this.logger.log(
        `executeBidAction: no change needed (${currentBid} === ${newBid})`,
      );
      return { success: true }; // No change needed
    }

    this.logger.log(
      `executeBidAction: calling updateBid for campaign ${campaign.id}, newBid=${newBid}, customerId=${campaign.customerId}, loginCustomerId=${campaign.loginCustomerId}`,
    );

    try {
      const result = await this.googleDashboardService.updateBid(
        userId,
        rule.connection_id,
        campaign.id,
        newBid,
        campaign.customerId,
        campaign.loginCustomerId,
      );
      this.logger.log(
        `executeBidAction: updateBid returned: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `executeBidAction: updateBid threw an error: ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute target CPA increase/decrease action
   */
  private async executeTargetCpaAction(
    rule: AutomationRule,
    campaign: CampaignMetricsDto,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!rule.action_value) {
      this.logger.warn(
        `executeTargetCpaAction: action_value not specified for rule ${rule.id}`,
      );
      return { success: false, error: "Action value not specified" };
    }

    // Check if campaign uses a CPA-based bidding strategy
    const cpaStrategies = ["TARGET_CPA", "MAXIMIZE_CONVERSIONS"];
    if (
      !campaign.biddingStrategyType ||
      !cpaStrategies.includes(campaign.biddingStrategyType)
    ) {
      this.logger.warn(
        `executeTargetCpaAction: Campaign ${campaign.id} does not use a CPA-based strategy (current: ${campaign.biddingStrategyType})`,
      );
      return {
        success: false,
        error: `Campanha não usa estratégia de CPA alvo (atual: ${campaign.biddingStrategyType || "desconhecida"})`,
      };
    }

    // Get current target CPA (from targetCpa field or CPA metric as fallback)
    const currentTargetCpa = campaign.targetCpa || campaign.cpa || 10;
    let newTargetCpa: number;

    if (rule.action_value_type === "percentage") {
      const changeAmount = currentTargetCpa * (rule.action_value / 100);
      newTargetCpa =
        rule.action_type === "increase_target_cpa"
          ? currentTargetCpa + changeAmount
          : currentTargetCpa - changeAmount;
    } else {
      // Absolute value
      newTargetCpa =
        rule.action_type === "increase_target_cpa"
          ? currentTargetCpa + rule.action_value
          : currentTargetCpa - rule.action_value;
    }

    this.logger.log(
      `executeTargetCpaAction: currentTargetCpa=${currentTargetCpa}, newTargetCpa=${newTargetCpa}, action_value=${rule.action_value}, action_value_type=${rule.action_value_type}`,
    );

    // Apply limit if specified
    if (rule.action_limit) {
      if (rule.action_type === "increase_target_cpa") {
        newTargetCpa = Math.min(newTargetCpa, rule.action_limit);
      } else {
        newTargetCpa = Math.max(newTargetCpa, rule.action_limit);
      }
      this.logger.log(
        `executeTargetCpaAction: after limit applied, newTargetCpa=${newTargetCpa}`,
      );
    }

    // Ensure target CPA doesn't go below minimum (0.01)
    newTargetCpa = Math.max(newTargetCpa, 0.01);
    // Round to 2 decimal places
    newTargetCpa = Math.round(newTargetCpa * 100) / 100;

    if (newTargetCpa === currentTargetCpa) {
      this.logger.log(
        `executeTargetCpaAction: no change needed (${currentTargetCpa} === ${newTargetCpa})`,
      );
      return { success: true }; // No change needed
    }

    this.logger.log(
      `executeTargetCpaAction: calling updateTargetCpa for campaign ${campaign.id}, newTargetCpa=${newTargetCpa}`,
    );

    try {
      const result = await this.googleDashboardService.updateTargetCpa(
        userId,
        rule.connection_id,
        campaign.id,
        newTargetCpa,
        campaign.customerId,
        campaign.loginCustomerId,
      );
      this.logger.log(
        `executeTargetCpaAction: updateTargetCpa returned: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `executeTargetCpaAction: updateTargetCpa threw an error: ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute target ROAS increase/decrease action
   */
  private async executeTargetRoasAction(
    rule: AutomationRule,
    campaign: CampaignMetricsDto,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!rule.action_value) {
      this.logger.warn(
        `executeTargetRoasAction: action_value not specified for rule ${rule.id}`,
      );
      return { success: false, error: "Action value not specified" };
    }

    // Check if campaign uses a ROAS-based bidding strategy
    const roasStrategies = ["TARGET_ROAS", "MAXIMIZE_CONVERSION_VALUE"];
    if (
      !campaign.biddingStrategyType ||
      !roasStrategies.includes(campaign.biddingStrategyType)
    ) {
      this.logger.warn(
        `executeTargetRoasAction: Campaign ${campaign.id} does not use a ROAS-based strategy (current: ${campaign.biddingStrategyType})`,
      );
      return {
        success: false,
        error: `Campanha não usa estratégia de ROAS alvo (atual: ${campaign.biddingStrategyType || "desconhecida"})`,
      };
    }

    // Get current target ROAS (from targetRoas field or ROAS metric as fallback)
    const currentTargetRoas = campaign.targetRoas || campaign.roas || 3.0;
    let newTargetRoas: number;

    if (rule.action_value_type === "percentage") {
      const changeAmount = currentTargetRoas * (rule.action_value / 100);
      newTargetRoas =
        rule.action_type === "increase_target_roas"
          ? currentTargetRoas + changeAmount
          : currentTargetRoas - changeAmount;
    } else {
      // Absolute value
      newTargetRoas =
        rule.action_type === "increase_target_roas"
          ? currentTargetRoas + rule.action_value
          : currentTargetRoas - rule.action_value;
    }

    this.logger.log(
      `executeTargetRoasAction: currentTargetRoas=${currentTargetRoas}, newTargetRoas=${newTargetRoas}, action_value=${rule.action_value}, action_value_type=${rule.action_value_type}`,
    );

    // Apply limit if specified
    if (rule.action_limit) {
      if (rule.action_type === "increase_target_roas") {
        newTargetRoas = Math.min(newTargetRoas, rule.action_limit);
      } else {
        newTargetRoas = Math.max(newTargetRoas, rule.action_limit);
      }
      this.logger.log(
        `executeTargetRoasAction: after limit applied, newTargetRoas=${newTargetRoas}`,
      );
    }

    // Ensure target ROAS doesn't go below minimum (0.01)
    newTargetRoas = Math.max(newTargetRoas, 0.01);
    // Round to 2 decimal places
    newTargetRoas = Math.round(newTargetRoas * 100) / 100;

    if (newTargetRoas === currentTargetRoas) {
      this.logger.log(
        `executeTargetRoasAction: no change needed (${currentTargetRoas} === ${newTargetRoas})`,
      );
      return { success: true }; // No change needed
    }

    this.logger.log(
      `executeTargetRoasAction: calling updateTargetRoas for campaign ${campaign.id}, newTargetRoas=${newTargetRoas}`,
    );

    try {
      const result = await this.googleDashboardService.updateTargetRoas(
        userId,
        rule.connection_id,
        campaign.id,
        newTargetRoas,
        campaign.customerId,
        campaign.loginCustomerId,
      );
      this.logger.log(
        `executeTargetRoasAction: updateTargetRoas returned: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `executeTargetRoasAction: updateTargetRoas threw an error: ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  // ============================================
  // Cooldown & Limits (T049)
  // ============================================

  /**
   * Check if action can be executed (respects cooldown and limits)
   * max_executions is checked PER CAMPAIGN, not globally
   */
  async checkCooldown(
    ruleId: string,
    campaignId: string,
    cooldownMinutes: number,
    _maxExecutions?: number,
  ): Promise<{ canExecute: boolean; reason?: string }> {
    // Get rule's max_executions setting
    const { data: rule } = await this.supabase
      .from("google_ads_automation_rules")
      .select("max_executions")
      .eq("id", ruleId)
      .single();

    // Check campaign-specific execution record
    const { data: execution } = await this.supabase
      .from("google_ads_automation_executions")
      .select("last_execution_at, execution_count")
      .eq("automation_rule_id", ruleId)
      .eq("google_campaign_id", campaignId)
      .single();

    // Check max executions PER CAMPAIGN (not global)
    const campaignExecutionCount = execution?.execution_count || 0;
    if (rule?.max_executions && campaignExecutionCount >= rule.max_executions) {
      return {
        canExecute: false,
        reason: `Maximum executions reached for this campaign (${campaignExecutionCount}/${rule.max_executions})`,
      };
    }

    // Check campaign-specific cooldown
    if (execution?.last_execution_at) {
      const lastExecution = new Date(execution.last_execution_at);
      const cooldownEnd = new Date(
        lastExecution.getTime() + cooldownMinutes * 60 * 1000,
      );
      const now = new Date();

      if (now < cooldownEnd) {
        const remainingMinutes = Math.ceil(
          (cooldownEnd.getTime() - now.getTime()) / 60000,
        );
        return {
          canExecute: false,
          reason: `Cooldown active (${remainingMinutes} minutes remaining)`,
        };
      }
    }

    return { canExecute: true };
  }

  /**
   * Record an execution for cooldown tracking
   */
  private async recordExecution(
    ruleId: string,
    campaignId: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    // Upsert execution record
    const { data: existing } = await this.supabase
      .from("google_ads_automation_executions")
      .select("id, execution_count")
      .eq("automation_rule_id", ruleId)
      .eq("google_campaign_id", campaignId)
      .single();

    if (existing) {
      await this.supabase
        .from("google_ads_automation_executions")
        .update({
          execution_count: existing.execution_count + 1,
          last_execution_at: now,
        })
        .eq("id", existing.id);
    } else {
      await this.supabase.from("google_ads_automation_executions").insert({
        automation_rule_id: ruleId,
        google_campaign_id: campaignId,
        execution_count: 1,
        last_execution_at: now,
      });
    }
  }

  /**
   * Update rule execution count and timestamp
   */
  private async updateRuleExecutionCount(ruleId: string): Promise<void> {
    const now = new Date().toISOString();

    const { data: rule } = await this.supabase
      .from("google_ads_automation_rules")
      .select("current_executions")
      .eq("id", ruleId)
      .single();

    await this.supabase
      .from("google_ads_automation_rules")
      .update({
        current_executions: (rule?.current_executions || 0) + 1,
        last_execution_at: now,
        last_run_at: now,
      })
      .eq("id", ruleId);
  }

  // ============================================
  // Test/Dry-Run (T050)
  // ============================================

  /**
   * Test an automation rule without executing actions
   * Returns which campaigns would match and what would happen
   */
  async testRule(
    ruleId: string,
    userId: string,
  ): Promise<TestAutomationResultDto> {
    this.logger.log(`testRule: Testing rule ${ruleId}`);
    const rule = await this.getRuleEntity(ruleId, userId);
    this.logger.log(
      `testRule: Rule loaded, conditions: ${JSON.stringify(rule.conditions)}`,
    );

    // Get campaigns from Google Ads
    const { campaigns } = await this.googleDashboardService.getCampaigns(
      userId,
      rule.connection_id,
      DashboardPeriod.LAST_7D,
    );
    this.logger.log(`testRule: Retrieved ${campaigns.length} campaigns`);

    const matchingCampaigns: TestAutomationResultDto["matchingCampaigns"] = [];

    for (const campaign of campaigns) {
      this.logger.log(
        `testRule: Checking campaign ${campaign.name}, impressions=${campaign.impressions}`,
      );

      // Check scope filters
      if (
        !this.campaignMatchesScope(
          campaign,
          rule.scope_type,
          rule.scope_filters,
        )
      ) {
        this.logger.log(
          `testRule: Campaign ${campaign.name} filtered out by scope`,
        );
        continue;
      }

      // Check conditions
      const conditionsMatch = this.evaluateConditions(
        rule.conditions,
        campaign,
      );
      this.logger.log(
        `testRule: Campaign ${campaign.name} conditionsMatch=${conditionsMatch}`,
      );

      if (!conditionsMatch) {
        continue;
      }

      // Check cooldown
      const cooldownCheck = await this.checkCooldown(
        ruleId,
        campaign.id,
        rule.cooldown_minutes,
        rule.max_executions,
      );

      matchingCampaigns.push({
        id: campaign.id,
        name: campaign.name,
        currentMetrics: {
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          ctr: campaign.ctr,
          cost: campaign.cost,
          conversions: campaign.conversions,
          cpa: campaign.cpa,
          budgetSpentPercent: campaign.budgetSpentPercent,
        },
        wouldExecute: cooldownCheck.canExecute,
        reason: cooldownCheck.canExecute
          ? `Would execute: ${rule.action_type}`
          : cooldownCheck.reason || "Unknown",
      });
    }

    return {
      matchingCampaigns,
      totalMatching: matchingCampaigns.length,
      testedAt: new Date().toISOString(),
    };
  }

  /**
   * Execute an automation rule immediately (manual trigger)
   * Returns the number of campaigns that were affected
   */
  async executeRuleNow(
    ruleId: string,
    userId: string,
  ): Promise<{ success: boolean; executedCount: number }> {
    this.logger.log(`Manual execution triggered for rule ${ruleId}`);

    const rule = await this.getRuleEntity(ruleId, userId);
    this.logger.log(
      `Rule loaded: ${rule.name}, action_type=${rule.action_type}, action_value=${rule.action_value}, action_value_type=${rule.action_value_type}`,
    );

    // Get connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", rule.connection_id)
      .single();

    if (connError || !connection || !isGoogleConnection(connection)) {
      this.logger.error(
        `Invalid connection for rule: ${connError?.message || "connection not found or invalid"}`,
      );
      throw new Error("Invalid connection for rule");
    }

    // Get campaigns from Google Ads
    const { campaigns } = await this.googleDashboardService.getCampaigns(
      userId,
      rule.connection_id,
      DashboardPeriod.LAST_7D,
    );

    this.logger.log(`Retrieved ${campaigns.length} campaigns for evaluation`);

    let executedCount = 0;

    for (const campaign of campaigns) {
      this.logger.log(`Evaluating campaign: ${campaign.name} (${campaign.id})`);

      // Check scope
      if (
        !this.campaignMatchesScope(
          campaign,
          rule.scope_type,
          rule.scope_filters,
        )
      ) {
        this.logger.log(`Campaign ${campaign.name} does not match scope`);
        continue;
      }

      // Check conditions
      const conditionsMatch = this.evaluateConditions(
        rule.conditions,
        campaign,
      );
      this.logger.log(
        `Campaign ${campaign.name} conditions match: ${conditionsMatch}, conditions: ${JSON.stringify(rule.conditions)}, impressions: ${campaign.impressions}`,
      );

      if (!conditionsMatch) {
        continue;
      }

      // Check cooldown
      const cooldownCheck = await this.checkCooldown(
        ruleId,
        campaign.id,
        rule.cooldown_minutes,
        rule.max_executions,
      );

      if (!cooldownCheck.canExecute) {
        this.logger.log(`Skipping ${campaign.name}: ${cooldownCheck.reason}`);
        continue;
      }

      this.logger.log(
        `Campaign ${campaign.name} passed all checks, executing action...`,
      );

      // Execute action
      const result = await this.executeAction(
        rule,
        campaign,
        connection as GoogleConnection,
        userId,
      );

      if (result.success) {
        executedCount++;
        this.logger.log(
          `Successfully executed ${rule.action_type} on ${campaign.name}`,
        );
      } else {
        this.logger.warn(
          `Failed to execute on ${campaign.name}: ${result.error}`,
        );
      }
    }

    // Update last run time
    await this.supabase
      .from("google_ads_automation_rules")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", ruleId);

    this.logger.log(`Execution complete: ${executedCount} campaigns affected`);

    return { success: true, executedCount };
  }

  /**
   * Check if a campaign matches scope filters
   */
  private campaignMatchesScope(
    campaign: CampaignMetricsDto,
    scopeType: "all" | "filter",
    scopeFilters?: ScopeFilters,
  ): boolean {
    if (scopeType === "all") {
      return true;
    }

    if (!scopeFilters) {
      return true;
    }

    // Name contains filter
    if (scopeFilters.nameContains) {
      if (
        !campaign.name
          .toLowerCase()
          .includes(scopeFilters.nameContains.toLowerCase())
      ) {
        return false;
      }
    }

    // Name not contains filter
    if (scopeFilters.nameNotContains) {
      if (
        campaign.name
          .toLowerCase()
          .includes(scopeFilters.nameNotContains.toLowerCase())
      ) {
        return false;
      }
    }

    // Status filter
    if (scopeFilters.status && campaign.status !== scopeFilters.status) {
      return false;
    }

    // Budget filters
    if (
      scopeFilters.minBudget !== undefined &&
      campaign.budget < scopeFilters.minBudget
    ) {
      return false;
    }

    if (
      scopeFilters.maxBudget !== undefined &&
      campaign.budget > scopeFilters.maxBudget
    ) {
      return false;
    }

    // Campaign IDs filter
    if (scopeFilters.campaignIds && scopeFilters.campaignIds.length > 0) {
      if (!scopeFilters.campaignIds.includes(campaign.id)) {
        return false;
      }
    }

    // Bidding strategy type filter
    if (
      scopeFilters.biddingStrategyType &&
      campaign.biddingStrategyType !== scopeFilters.biddingStrategyType
    ) {
      return false;
    }

    return true;
  }

  // ============================================
  // Automation Runner (for cron job)
  // ============================================

  /**
   * Run all active automations that are due to be checked
   * Called by the cron job
   */
  async runDueAutomations(): Promise<void> {
    this.logger.log("Running due automations...");

    // Get all active rules that need to be checked
    const { data: rules, error } = await this.supabase
      .from("google_ads_automation_rules")
      .select("*")
      .eq("is_active", true);

    if (error || !rules) {
      this.logger.error(`Failed to get automation rules: ${error?.message}`);
      return;
    }

    const now = new Date();

    for (const rule of rules) {
      try {
        // Check if rule is due to run based on frequency
        const lastRun = rule.last_run_at ? new Date(rule.last_run_at) : null;
        const frequencyMs = rule.check_frequency_minutes * 60 * 1000;

        if (lastRun && now.getTime() - lastRun.getTime() < frequencyMs) {
          continue; // Not due yet
        }

        this.logger.log(`Running automation: ${rule.name} (${rule.id})`);

        // Get connection
        const { data: connection, error: connError } = await this.supabase
          .from("connections")
          .select("*")
          .eq("id", rule.connection_id)
          .single();

        if (connError || !connection || !isGoogleConnection(connection)) {
          this.logger.warn(`Invalid connection for rule ${rule.id}`);
          continue;
        }

        // Check if connection needs manual reconnection
        // @feature 20260202-oauth-token-management
        // @requirement FR-009: Skip automations for connections with needs_reconnect=true
        // @requirement FR-010: Log skip reason when automation is skipped
        if (connection.needs_reconnect) {
          this.logger.warn(
            `Skipping automation ${rule.name} (${rule.id}): Connection needs manual reconnection. ` +
              `Last error: ${connection.last_refresh_error || "unknown"}`,
          );

          // Log the skip event to connection_logs
          // @requirement FR-023: Log operations rejected by needs_reconnect
          await this.connectionsService.createConnectionLog(
            connection.id,
            "operation_skipped_needs_reconnect",
            "warning",
            `Automation "${rule.name}" skipped: connection requires manual reconnection`,
            {
              automation_rule_id: rule.id,
              automation_name: rule.name,
              last_refresh_error: connection.last_refresh_error,
            },
          );

          continue;
        }

        // Check if circuit breaker is open for this connection
        // @feature 20260202-oauth-token-management
        // @requirement FR-012: Block requests when circuit is open
        // @requirement FR-013: Keep circuit open for 15 minutes
        if (!this.circuitBreakerService.canRequest(connection.id)) {
          const cbStatus = this.circuitBreakerService.getCircuitBreakerStatus(
            connection.id,
          );
          this.logger.warn(
            `Skipping automation ${rule.name} (${rule.id}): Circuit breaker is open. ` +
              `State: ${cbStatus.state}, Next retry: ${cbStatus.nextRetryAt || "unknown"}`,
          );

          // Log the skip event to connection_logs
          await this.circuitBreakerService.logRejection(connection.id);

          continue;
        }

        // Get campaigns
        const { campaigns } = await this.googleDashboardService.getCampaigns(
          rule.user_id,
          rule.connection_id,
          DashboardPeriod.LAST_7D,
        );

        // Process each campaign
        for (const campaign of campaigns) {
          // Check scope
          if (
            !this.campaignMatchesScope(
              campaign,
              rule.scope_type,
              rule.scope_filters,
            )
          ) {
            continue;
          }

          // Check conditions
          if (!this.evaluateConditions(rule.conditions, campaign)) {
            continue;
          }

          // Check cooldown
          const cooldownCheck = await this.checkCooldown(
            rule.id,
            campaign.id,
            rule.cooldown_minutes,
            rule.max_executions,
          );

          if (!cooldownCheck.canExecute) {
            this.logger.log(
              `Skipping ${campaign.name}: ${cooldownCheck.reason}`,
            );
            continue;
          }

          // Execute action
          const result = await this.executeAction(
            rule,
            campaign,
            connection as GoogleConnection,
            rule.user_id,
          );

          if (result.success) {
            this.logger.log(
              `Successfully executed ${rule.action_type} on ${campaign.name}`,
            );
          } else {
            this.logger.warn(
              `Failed to execute on ${campaign.name}: ${result.error}`,
            );
          }
        }

        // Update last run time
        await this.supabase
          .from("google_ads_automation_rules")
          .update({ last_run_at: now.toISOString() })
          .eq("id", rule.id);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Error running automation ${rule.id}: ${errorMsg}`);
      }
    }

    this.logger.log("Finished running automations");
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get raw rule entity from database
   */
  private async getRuleEntity(
    ruleId: string,
    userId: string,
  ): Promise<AutomationRule> {
    const { data, error } = await this.supabase
      .from("google_ads_automation_rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Automation rule not found");
    }

    return data as AutomationRule;
  }

  /**
   * Map database row to response DTO
   */
  private mapToResponseDto(row: any): AutomationRuleResponseDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      scopeType: row.scope_type,
      scopeFilters: row.scope_filters,
      conditions: row.conditions,
      actionType: row.action_type,
      actionValue: row.action_value,
      actionValueType: row.action_value_type,
      actionLimit: row.action_limit,
      checkFrequencyMinutes: row.check_frequency_minutes,
      cooldownMinutes: row.cooldown_minutes,
      maxExecutions: row.max_executions,
      currentExecutions: row.current_executions,
      lastRunAt: row.last_run_at,
      lastExecutionAt: row.last_execution_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
