import {
  ConditionTree,
  ScopeFilters,
  ActionType,
  ActionValueType,
} from "../dto/automation-rule.dto";

/**
 * AutomationRule entity representing google_ads_automation_rules table
 */
export interface AutomationRule {
  id: string;
  user_id: string;
  connection_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  scope_type: "all" | "filter";
  scope_filters?: ScopeFilters;
  conditions: ConditionTree;
  action_type: ActionType;
  action_value?: number;
  action_value_type?: ActionValueType;
  action_limit?: number;
  check_frequency_minutes: number;
  cooldown_minutes: number;
  max_executions?: number;
  current_executions: number;
  last_run_at?: string;
  last_execution_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * AutomationExecution entity representing google_ads_automation_executions table
 * Tracks executions per campaign for cooldown and limit control
 */
export interface AutomationExecution {
  id: string;
  automation_rule_id: string;
  google_campaign_id: string;
  execution_count: number;
  last_execution_at: string;
}

/**
 * Input for creating an automation rule
 */
export interface CreateAutomationRuleInput {
  user_id: string;
  connection_id: string;
  name: string;
  description?: string;
  scope_type?: "all" | "filter";
  scope_filters?: ScopeFilters;
  conditions: ConditionTree;
  action_type: ActionType;
  action_value?: number;
  action_value_type?: ActionValueType;
  action_limit?: number;
  check_frequency_minutes?: number;
  cooldown_minutes?: number;
  max_executions?: number;
}

/**
 * Input for updating an automation rule
 */
export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  is_active?: boolean;
  scope_type?: "all" | "filter";
  scope_filters?: ScopeFilters;
  conditions?: ConditionTree;
  action_type?: ActionType;
  action_value?: number;
  action_value_type?: ActionValueType;
  action_limit?: number;
  check_frequency_minutes?: number;
  cooldown_minutes?: number;
  max_executions?: number;
}
