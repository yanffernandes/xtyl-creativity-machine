import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { PageSpeedCheckResult } from "./types/pagespeed-api.types";

export type PageSpeedNotificationType =
  | "pagespeed_poor_performance"
  | "pagespeed_degraded"
  | "pagespeed_cwv_failed"
  | "pagespeed_improved";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface PerformanceSuggestion {
  metric: string;
  issue: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
  impact: string;
}

// Thresholds for Core Web Vitals (based on Google's recommendations)
const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // ms
  fid: { good: 100, poor: 300 }, // ms
  cls: { good: 0.1, poor: 0.25 }, // score
  fcp: { good: 1800, poor: 3000 }, // ms
  ttfb: { good: 800, poor: 1800 }, // ms
  tbt: { good: 200, poor: 600 }, // ms
  si: { good: 3400, poor: 5800 }, // ms
};

// Performance score thresholds
const SCORE_THRESHOLDS = {
  good: 90,
  needsImprovement: 50,
  poor: 0,
};

// Degradation threshold (percentage drop)
const DEGRADATION_THRESHOLD = 15;

@Injectable()
export class PageSpeedNotificationsService {
  private readonly logger = new Logger(PageSpeedNotificationsService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Analyze PageSpeed results and send notifications if needed
   */
  async analyzeAndNotify(params: {
    projectId: number;
    projectName: string;
    domain: string;
    userId: string;
    currentResult: PageSpeedCheckResult;
    previousScore: number | null;
  }): Promise<void> {
    const {
      projectId,
      projectName,
      domain,
      userId,
      currentResult,
      previousScore,
    } = params;

    const currentScore = currentResult.performanceScore;
    const strategy = currentResult.strategy;

    // Skip if no valid score
    if (currentScore === null) {
      return;
    }

    // Check for poor performance
    if (currentScore < SCORE_THRESHOLDS.needsImprovement) {
      await this.notifyPoorPerformance({
        userId,
        projectId,
        projectName,
        domain,
        strategy,
        score: currentScore,
        result: currentResult,
      });
      return;
    }

    // Check for degradation
    if (previousScore !== null && previousScore > 0) {
      const drop = previousScore - currentScore;
      const dropPercentage = (drop / previousScore) * 100;

      if (dropPercentage >= DEGRADATION_THRESHOLD) {
        await this.notifyDegradation({
          userId,
          projectId,
          projectName,
          domain,
          strategy,
          previousScore,
          currentScore,
          dropPercentage,
          result: currentResult,
        });
        return;
      }
    }

    // Check for Core Web Vitals failures
    const cwvIssues = this.checkCoreWebVitals(currentResult);
    if (cwvIssues.length > 0) {
      await this.notifyCWVFailed({
        userId,
        projectId,
        projectName,
        domain,
        strategy,
        issues: cwvIssues,
        result: currentResult,
      });
    }
  }

  /**
   * Check Core Web Vitals and return list of issues
   */
  private checkCoreWebVitals(result: PageSpeedCheckResult): string[] {
    const issues: string[] = [];

    if (result.lcpMs !== null && result.lcpMs > CWV_THRESHOLDS.lcp.poor) {
      issues.push(`LCP muito alto (${(result.lcpMs / 1000).toFixed(1)}s)`);
    }

    if (result.fidMs !== null && result.fidMs > CWV_THRESHOLDS.fid.poor) {
      issues.push(`FID muito alto (${result.fidMs}ms)`);
    }

    if (result.cls !== null && result.cls > CWV_THRESHOLDS.cls.poor) {
      issues.push(`CLS muito alto (${result.cls.toFixed(3)})`);
    }

    return issues;
  }

  /**
   * Generate actionable suggestions based on metrics
   */
  generateSuggestions(result: PageSpeedCheckResult): PerformanceSuggestion[] {
    const suggestions: PerformanceSuggestion[] = [];

    // LCP suggestions
    if (result.lcpMs !== null && result.lcpMs > CWV_THRESHOLDS.lcp.good) {
      suggestions.push({
        metric: "LCP",
        issue: `Largest Contentful Paint em ${(result.lcpMs / 1000).toFixed(1)}s`,
        suggestion:
          "Otimize imagens (WebP/AVIF), use lazy loading, implemente preload para recursos críticos e considere usar CDN.",
        priority: result.lcpMs > CWV_THRESHOLDS.lcp.poor ? "high" : "medium",
        impact: "Alto impacto na experiência do usuário",
      });
    }

    // CLS suggestions
    if (result.cls !== null && result.cls > CWV_THRESHOLDS.cls.good) {
      suggestions.push({
        metric: "CLS",
        issue: `Cumulative Layout Shift em ${result.cls.toFixed(3)}`,
        suggestion:
          "Defina dimensões para imagens/vídeos, reserve espaço para conteúdo dinâmico e evite inserir conteúdo acima do existente.",
        priority: result.cls > CWV_THRESHOLDS.cls.poor ? "high" : "medium",
        impact: "Evita mudanças visuais irritantes",
      });
    }

    // TBT/FID suggestions
    if (result.tbtMs !== null && result.tbtMs > CWV_THRESHOLDS.tbt.good) {
      suggestions.push({
        metric: "TBT",
        issue: `Total Blocking Time em ${result.tbtMs}ms`,
        suggestion:
          "Divida tarefas JavaScript longas, remova código não utilizado, adie scripts não críticos e minimize o trabalho do thread principal.",
        priority: result.tbtMs > CWV_THRESHOLDS.tbt.poor ? "high" : "medium",
        impact: "Melhora a responsividade",
      });
    }

    // TTFB suggestions
    if (result.ttfbMs !== null && result.ttfbMs > CWV_THRESHOLDS.ttfb.good) {
      suggestions.push({
        metric: "TTFB",
        issue: `Time to First Byte em ${result.ttfbMs}ms`,
        suggestion:
          "Otimize o servidor (cache, database), use CDN, considere edge computing e reduza redirecionamentos.",
        priority: result.ttfbMs > CWV_THRESHOLDS.ttfb.poor ? "high" : "medium",
        impact: "Acelera o início do carregamento",
      });
    }

    // FCP suggestions
    if (result.fcpMs !== null && result.fcpMs > CWV_THRESHOLDS.fcp.good) {
      suggestions.push({
        metric: "FCP",
        issue: `First Contentful Paint em ${(result.fcpMs / 1000).toFixed(1)}s`,
        suggestion:
          "Elimine recursos que bloqueiam renderização, inline CSS crítico e otimize a entrega de fontes.",
        priority: result.fcpMs > CWV_THRESHOLDS.fcp.poor ? "high" : "medium",
        impact: "Melhora a percepção de velocidade",
      });
    }

    // Speed Index suggestions
    if (result.siMs !== null && result.siMs > CWV_THRESHOLDS.si.good) {
      suggestions.push({
        metric: "Speed Index",
        issue: `Speed Index em ${(result.siMs / 1000).toFixed(1)}s`,
        suggestion:
          "Priorize conteúdo visível, otimize a ordem de carregamento e minimize o JavaScript que bloqueia a renderização.",
        priority: result.siMs > CWV_THRESHOLDS.si.poor ? "high" : "medium",
        impact: "Melhora a velocidade visual de carregamento",
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return suggestions;
  }

  /**
   * Notify about poor performance
   */
  private async notifyPoorPerformance(params: {
    userId: string;
    projectId: number;
    projectName: string;
    domain: string;
    strategy: "mobile" | "desktop";
    score: number;
    result: PageSpeedCheckResult;
  }): Promise<void> {
    const { userId, projectId, projectName, domain, strategy, score, result } =
      params;

    // Check for recent similar notification (avoid spam)
    const hasRecent = await this.hasRecentNotification(
      userId,
      "pagespeed_poor_performance",
      projectId,
      strategy,
      24,
    );
    if (hasRecent) {
      return;
    }

    const suggestions = this.generateSuggestions(result);
    const topSuggestions = suggestions.slice(0, 3);

    const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";
    const suggestionText =
      topSuggestions.length > 0
        ? `\n\nPrincipais ações:\n${topSuggestions.map((s) => `• ${s.suggestion.split(",")[0]}`).join("\n")}`
        : "";

    await this.createNotification(
      userId,
      "pagespeed_poor_performance",
      `Performance baixa em ${projectName}`,
      `O site ${domain} (${strategyLabel}) tem score de performance ${score}/100. Isso pode afetar seu SEO e a experiência dos usuários.${suggestionText}`,
      {
        project_id: projectId,
        project_name: projectName,
        domain,
        strategy,
        score,
        suggestions: topSuggestions,
        action_required: "optimize",
      },
    );

    this.logger.log(
      `Sent poor performance notification for project ${projectId} (${strategy}): ${score}`,
    );
  }

  /**
   * Notify about performance degradation
   */
  private async notifyDegradation(params: {
    userId: string;
    projectId: number;
    projectName: string;
    domain: string;
    strategy: "mobile" | "desktop";
    previousScore: number;
    currentScore: number;
    dropPercentage: number;
    result: PageSpeedCheckResult;
  }): Promise<void> {
    const {
      userId,
      projectId,
      projectName,
      domain,
      strategy,
      previousScore,
      currentScore,
      dropPercentage,
      result,
    } = params;

    // Check for recent similar notification
    const hasRecent = await this.hasRecentNotification(
      userId,
      "pagespeed_degraded",
      projectId,
      strategy,
      48, // 48 hours for degradation
    );
    if (hasRecent) {
      return;
    }

    const suggestions = this.generateSuggestions(result);
    const topSuggestions = suggestions.slice(0, 3);

    const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";
    const suggestionText =
      topSuggestions.length > 0
        ? `\n\nVerifique:\n${topSuggestions.map((s) => `• ${s.metric}: ${s.issue}`).join("\n")}`
        : "";

    await this.createNotification(
      userId,
      "pagespeed_degraded",
      `Queda de performance em ${projectName}`,
      `O site ${domain} (${strategyLabel}) teve uma queda de ${Math.round(dropPercentage)}% na performance (${previousScore} → ${currentScore}).${suggestionText}`,
      {
        project_id: projectId,
        project_name: projectName,
        domain,
        strategy,
        previous_score: previousScore,
        current_score: currentScore,
        drop_percentage: Math.round(dropPercentage),
        suggestions: topSuggestions,
        action_required: "investigate",
      },
    );

    this.logger.log(
      `Sent degradation notification for project ${projectId} (${strategy}): ${previousScore} → ${currentScore}`,
    );
  }

  /**
   * Notify about Core Web Vitals failures
   */
  private async notifyCWVFailed(params: {
    userId: string;
    projectId: number;
    projectName: string;
    domain: string;
    strategy: "mobile" | "desktop";
    issues: string[];
    result: PageSpeedCheckResult;
  }): Promise<void> {
    const { userId, projectId, projectName, domain, strategy, issues, result } =
      params;

    // Check for recent similar notification
    const hasRecent = await this.hasRecentNotification(
      userId,
      "pagespeed_cwv_failed",
      projectId,
      strategy,
      72, // 72 hours for CWV
    );
    if (hasRecent) {
      return;
    }

    const suggestions = this.generateSuggestions(result);
    const relevantSuggestions = suggestions.filter(
      (s) => s.priority === "high",
    );

    const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";

    await this.createNotification(
      userId,
      "pagespeed_cwv_failed",
      `Core Web Vitals reprovados em ${projectName}`,
      `O site ${domain} (${strategyLabel}) não passou nos Core Web Vitals do Google:\n• ${issues.join("\n• ")}\n\nIsso pode afetar seu posicionamento no Google.`,
      {
        project_id: projectId,
        project_name: projectName,
        domain,
        strategy,
        cwv_issues: issues,
        suggestions: relevantSuggestions,
        action_required: "fix_cwv",
      },
    );

    this.logger.log(
      `Sent CWV failed notification for project ${projectId} (${strategy})`,
    );
  }

  /**
   * Create a notification in the database
   */
  private async createNotification(
    userId: string,
    type: PageSpeedNotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const { data, error } = await this.supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to create PageSpeed notification:", error);
      throw error;
    }

    return data;
  }

  /**
   * Check for duplicate recent notification
   */
  private async hasRecentNotification(
    userId: string,
    type: PageSpeedNotificationType,
    projectId: number,
    strategy: string,
    withinHours: number,
  ): Promise<boolean> {
    const since = new Date();
    since.setHours(since.getHours() - withinHours);

    const { data, error } = await this.supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .gte("created_at", since.toISOString())
      .contains("metadata", { project_id: projectId, strategy })
      .limit(1);

    if (error) {
      this.logger.warn("Error checking recent PageSpeed notifications:", error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Get user ID from project (via workspace)
   */
  async getProjectOwnerUserId(projectId: number): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("workspace:workspaces(owner_user_id)")
      .eq("id", projectId)
      .single();

    if (error || !data?.workspace) {
      this.logger.warn(
        `Could not get owner for project ${projectId}:`,
        error?.message,
      );
      return null;
    }

    // Supabase join returns object for single() query
    const workspace = data.workspace as unknown as { owner_user_id: string };
    return workspace?.owner_user_id;
  }

  /**
   * Get project details for notification
   */
  async getProjectDetails(
    projectId: number,
  ): Promise<{ name: string; domain: string } | null> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("name, domain")
      .eq("id", projectId)
      .single();

    if (error || !data) {
      return null;
    }

    return { name: data.name, domain: data.domain };
  }
}
