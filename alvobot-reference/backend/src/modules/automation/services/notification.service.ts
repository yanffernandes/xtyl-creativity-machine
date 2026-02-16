import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../email/email.service';
import { AutomationRuleEntity } from '../entities/automation-rule.entity';
import { NotificationConfig } from '../dto/automation-rule.dto';

// ============================================================================
// AUTOMATION NOTIFICATION SERVICE
// ============================================================================

/**
 * AutomationNotificationService
 *
 * Sends email notifications for automation execution events.
 * Supports:
 * - Rule executed with affected entities
 * - Rule execution failed with errors
 * - No entities matched (informational)
 * - Entity details table and metrics snapshot
 *
 * Uses the global EmailService (Resend) for delivery.
 */
@Injectable()
export class AutomationNotificationService {
  private readonly logger = new Logger(AutomationNotificationService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send an execution notification email to configured recipients.
   *
   * Evaluates notification preferences (notifyOnAction, notifyOnError, notifyOnNoMatch)
   * to determine if a notification should be sent.
   *
   * @param rule - The automation rule that was executed
   * @param log - Execution result summary
   * @param notifications - Notification configuration from the rule
   * @returns Delivery result with sent status and metadata
   */
  async sendExecutionNotification(
    rule: AutomationRuleEntity,
    log: {
      status: string;
      entities_affected: number;
      errors_count: number;
      affected_entities: Array<{
        entity_id: string;
        entity_name: string;
        entity_type: string;
        task_index: number;
        action_executed: string;
        previous_value?: string | number | boolean;
        new_value?: string | number | boolean;
        metrics_snapshot?: Record<string, number>;
        status: string;
        error?: string;
      }>;
      errors: Array<{
        entity_id?: string;
        entity_name?: string;
        task_index?: number;
        action?: string;
        error_message: string;
        timestamp: string;
      }>;
    },
    notifications: NotificationConfig | undefined,
  ): Promise<{ sent: boolean; emails?: string[]; sentAt?: string }> {
    if (!notifications?.emails?.length) {
      return { sent: false };
    }

    // Evaluate whether a notification should be sent based on config
    const shouldNotify =
      (notifications.notifyOnAction && log.entities_affected > 0) ||
      (notifications.notifyOnError && log.errors_count > 0) ||
      (notifications.notifyOnNoMatch &&
        log.entities_affected === 0 &&
        log.errors_count === 0);

    if (!shouldNotify) {
      this.logger.debug(
        `Rule ${rule.id}: Notification skipped (no matching trigger condition)`,
      );
      return { sent: false };
    }

    const subject = this.buildSubject(
      rule,
      log,
      notifications.customSubject,
    );
    const html = this.buildEmailHtml(rule, log, notifications);

    try {
      for (const email of notifications.emails) {
        await this.emailService.sendEmail({
          to: email,
          subject,
          htmlContent: html,
          tags: ['automation', rule.platform, rule.id],
        });
      }

      const sentAt = new Date().toISOString();
      this.logger.log(
        `Rule ${rule.id}: Notification sent to ${notifications.emails.length} recipient(s)`,
      );

      return {
        sent: true,
        emails: notifications.emails,
        sentAt,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Rule ${rule.id}: Failed to send notification: ${errorMsg}`,
      );
      return { sent: false };
    }
  }

  // ============================================
  // PRIVATE: Subject Builder
  // ============================================

  /**
   * Build the email subject line.
   * Supports placeholders: {rule_name}, {entities_count}, {platform},
   * {timestamp}, {errors_count}, {status}
   */
  private buildSubject(
    rule: AutomationRuleEntity,
    log: { status: string; entities_affected: number; errors_count: number },
    customSubject?: string,
  ): string {
    const template =
      customSubject ||
      '\u{1F916} Automa\u{00E7}\u{00E3}o: {rule_name} \u{2014} {entities_count} entidades afetadas';

    let formattedTimestamp: string;
    try {
      formattedTimestamp = new Date().toLocaleString('pt-BR', {
        timeZone: rule.timezone || 'America/Sao_Paulo',
      });
    } catch {
      formattedTimestamp = new Date().toLocaleString('pt-BR');
    }

    const platformLabel =
      rule.platform === 'meta' ? 'Meta Ads' : 'Google Ads';

    return template
      .replace(/{rule_name}/g, rule.name)
      .replace(/{entities_count}/g, String(log.entities_affected))
      .replace(/{platform}/g, platformLabel)
      .replace(/{timestamp}/g, formattedTimestamp)
      .replace(/{errors_count}/g, String(log.errors_count))
      .replace(/{status}/g, log.status);
  }

  // ============================================
  // PRIVATE: Email HTML Builder
  // ============================================

  /**
   * Build the complete HTML email with inline CSS.
   *
   * Sections:
   * 1. Header with AlvoBot branding
   * 2. Status banner (success/error/partial/skipped)
   * 3. Summary section (rule name, platform, status, timestamp)
   * 4. Counters (entities evaluated, matched, affected, errors)
   * 5. Affected entities table (if includeEntityDetails)
   * 6. Metrics snapshot (if includeMetricsSnapshot)
   * 7. Error details (if any errors)
   * 8. Footer with link to AlvoBot
   */
  private buildEmailHtml(
    rule: AutomationRuleEntity,
    log: {
      status: string;
      entities_affected: number;
      errors_count: number;
      affected_entities: Array<{
        entity_id: string;
        entity_name: string;
        entity_type: string;
        task_index: number;
        action_executed: string;
        previous_value?: string | number | boolean;
        new_value?: string | number | boolean;
        metrics_snapshot?: Record<string, number>;
        status: string;
        error?: string;
      }>;
      errors: Array<{
        entity_id?: string;
        entity_name?: string;
        task_index?: number;
        action?: string;
        error_message: string;
        timestamp: string;
      }>;
    },
    config: NotificationConfig,
  ): string {
    const platformLabel =
      rule.platform === 'meta' ? 'Meta Ads' : 'Google Ads';

    let formattedTimestamp: string;
    try {
      formattedTimestamp = new Date().toLocaleString('pt-BR', {
        timeZone: rule.timezone || 'America/Sao_Paulo',
        dateStyle: 'long',
        timeStyle: 'short',
      });
    } catch {
      formattedTimestamp = new Date().toLocaleString('pt-BR');
    }

    const statusConfig = this.getStatusConfig(log.status);

    // Build sections
    const summarySection = this.buildSummarySection(
      rule,
      platformLabel,
      formattedTimestamp,
      statusConfig,
    );

    const countersSection = config.includeSummary
      ? this.buildCountersSection(log)
      : '';

    const entitiesSection =
      config.includeEntityDetails && log.affected_entities.length > 0
        ? this.buildEntitiesTableSection(log.affected_entities)
        : '';

    const metricsSection =
      config.includeMetricsSnapshot && log.affected_entities.length > 0
        ? this.buildMetricsSnapshotSection(log.affected_entities)
        : '';

    const errorsSection =
      log.errors.length > 0
        ? this.buildErrorsSection(log.errors)
        : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Automação - ${this.escapeHtml(rule.name)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F9FAFB; color: #344054;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 20px; text-align: center; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);">
              <h1 style="margin: 0 0 4px; color: #1a1a2e; font-size: 24px; font-weight: 700;">AlvoBot</h1>
              <p style="margin: 0; color: #44403c; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">AUTOMA\u{00C7}\u{00C3}O DE AN\u{00DA}NCIOS</p>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 16px 40px; background-color: ${statusConfig.bgColor}; border-bottom: 2px solid ${statusConfig.borderColor};">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 16px; font-weight: 600; color: ${statusConfig.textColor};">
                          ${statusConfig.icon} ${statusConfig.label}
                        </td>
                        <td style="text-align: right; font-size: 13px; color: ${statusConfig.textColor};">
                          ${formattedTimestamp}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary -->
          ${summarySection}

          <!-- Counters -->
          ${countersSection}

          <!-- Affected Entities Table -->
          ${entitiesSection}

          <!-- Metrics Snapshot -->
          ${metricsSection}

          <!-- Errors -->
          ${errorsSection}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F9FAFB; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px; color: #6B7280; font-size: 12px;">
                Esta notifica\u{00E7}\u{00E3}o foi enviada automaticamente pelo motor de automa\u{00E7}\u{00E3}o AlvoBot.
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 11px;">
                \u{00A9} ${new Date().getFullYear()} AlvoBot. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ============================================
  // PRIVATE: Email Section Builders
  // ============================================

  private buildSummarySection(
    rule: AutomationRuleEntity,
    platformLabel: string,
    _timestamp: string,
    _statusConfig: StatusConfig,
  ): string {
    const levelLabels: Record<string, string> = {
      campaign: 'Campanha',
      adset: 'Conjunto de an\u{00FA}ncios',
      ad_group: 'Grupo de an\u{00FA}ncios',
      ad: 'An\u{00FA}ncio',
      keyword: 'Palavra-chave',
      ad_account: 'Conta de an\u{00FA}ncios',
    };

    const levelLabel = levelLabels[rule.level] || rule.level;

    return `
          <tr>
            <td style="padding: 28px 40px 20px;">
              <h2 style="margin: 0 0 16px; color: #344054; font-size: 18px; font-weight: 600;">
                ${this.escapeHtml(rule.name)}
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
                    <span style="color: #6B7280; font-size: 13px;">Plataforma</span>
                    <span style="float: right; color: #344054; font-size: 13px; font-weight: 600;">${platformLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
                    <span style="color: #6B7280; font-size: 13px;">N\u{00ED}vel</span>
                    <span style="float: right; color: #344054; font-size: 13px; font-weight: 600;">${levelLabel}</span>
                  </td>
                </tr>
                ${rule.description ? `
                <tr>
                  <td style="padding: 12px 16px;">
                    <span style="color: #6B7280; font-size: 13px;">Descri\u{00E7}\u{00E3}o</span>
                    <p style="margin: 4px 0 0; color: #344054; font-size: 13px;">${this.escapeHtml(rule.description)}</p>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>`;
  }

  private buildCountersSection(log: {
    entities_affected: number;
    errors_count: number;
  }): string {
    return `
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48%" style="padding: 16px; background-color: ${log.entities_affected > 0 ? '#ECFDF5' : '#F9FAFB'}; border-radius: 8px; text-align: center; border: 1px solid ${log.entities_affected > 0 ? '#A7F3D0' : '#E5E7EB'};">
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${log.entities_affected > 0 ? '#10B981' : '#6B7280'};">${log.entities_affected}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Entidades afetadas</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="padding: 16px; background-color: ${log.errors_count > 0 ? '#FEF2F2' : '#F9FAFB'}; border-radius: 8px; text-align: center; border: 1px solid ${log.errors_count > 0 ? '#FECACA' : '#E5E7EB'};">
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${log.errors_count > 0 ? '#EF4444' : '#6B7280'};">${log.errors_count}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Erros</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
  }

  private buildEntitiesTableSection(
    entities: Array<{
      entity_name: string;
      entity_type: string;
      action_executed: string;
      previous_value?: string | number | boolean;
      new_value?: string | number | boolean;
      status: string;
      error?: string;
    }>,
  ): string {
    // Limit to 20 entities to avoid huge emails
    const displayEntities = entities.slice(0, 20);
    const hasMore = entities.length > 20;

    const actionLabels: Record<string, string> = {
      pause: 'Pausar',
      start: 'Ativar',
      increase_budget: 'Aumentar or\u{00E7}amento',
      decrease_budget: 'Diminuir or\u{00E7}amento',
      set_budget: 'Definir or\u{00E7}amento',
      scale_budget_by_target: 'Escalar or\u{00E7}amento',
      increase_bid: 'Aumentar lance',
      decrease_bid: 'Diminuir lance',
      set_bid: 'Definir lance',
      set_bid_strategy: 'Definir estrat\u{00E9}gia',
      duplicate: 'Duplicar',
      add_to_name: 'Adicionar ao nome',
      remove_from_name: 'Remover do nome',
      replace_in_name: 'Substituir no nome',
      extend_end_date: 'Estender data final',
      notify: 'Notificar',
    };

    const rows = displayEntities
      .map((entity) => {
        const actionLabel =
          actionLabels[entity.action_executed] || entity.action_executed;

        const statusColor =
          entity.status === 'success'
            ? '#10B981'
            : entity.status === 'failed'
              ? '#EF4444'
              : '#F59E0B';

        const statusLabel =
          entity.status === 'success'
            ? '\u{2713}'
            : entity.status === 'failed'
              ? '\u{2717}'
              : '\u{23F8}';

        const prevValue =
          entity.previous_value !== undefined
            ? String(entity.previous_value)
            : '\u{2014}';
        const newValue =
          entity.new_value !== undefined
            ? String(entity.new_value)
            : '\u{2014}';

        return `
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #344054; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.escapeHtml(entity.entity_name)}
                  </td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">
                    ${actionLabel}
                  </td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #6B7280; text-align: center;">
                    ${this.escapeHtml(prevValue)} \u{2192} ${this.escapeHtml(newValue)}
                  </td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
                    <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">${statusLabel}</span>
                  </td>
                </tr>`;
      })
      .join('');

    return `
          <tr>
            <td style="padding: 8px 40px 24px;">
              <h3 style="margin: 0 0 12px; color: #344054; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Entidades Afetadas
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #F9FAFB;">
                  <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">
                    Entidade
                  </td>
                  <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">
                    A\u{00E7}\u{00E3}o
                  </td>
                  <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB; text-align: center;">
                    Anterior \u{2192} Novo
                  </td>
                  <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB; text-align: center;">
                    Status
                  </td>
                </tr>
                ${rows}
              </table>
              ${hasMore ? `<p style="margin: 8px 0 0; color: #6B7280; font-size: 12px; text-align: center;">... e mais ${entities.length - 20} entidades (veja o log completo no AlvoBot)</p>` : ''}
            </td>
          </tr>`;
  }

  private buildMetricsSnapshotSection(
    entities: Array<{
      entity_name: string;
      metrics_snapshot?: Record<string, number>;
    }>,
  ): string {
    // Only include entities that have a metrics snapshot
    const withMetrics = entities.filter(
      (e) => e.metrics_snapshot && Object.keys(e.metrics_snapshot).length > 0,
    );

    if (withMetrics.length === 0) return '';

    // Get the first 5 entities with metrics and the first 6 metric keys
    const displayEntities = withMetrics.slice(0, 5);
    const allMetricKeys = new Set<string>();
    for (const entity of displayEntities) {
      if (entity.metrics_snapshot) {
        for (const key of Object.keys(entity.metrics_snapshot)) {
          allMetricKeys.add(key);
        }
      }
    }
    const metricKeys = Array.from(allMetricKeys).slice(0, 6);

    if (metricKeys.length === 0) return '';

    const metricLabels: Record<string, string> = {
      impressions: 'Impress\u{00F5}es',
      clicks: 'Cliques',
      spend: 'Gasto',
      ctr: 'CTR',
      cpc: 'CPC',
      cpm: 'CPM',
      conversions: 'Convers\u{00F5}es',
      cost_per_conversion: 'Custo/Conv.',
      roas: 'ROAS',
      reach: 'Alcance',
      frequency: 'Frequ\u{00EA}ncia',
    };

    const headerCells = metricKeys
      .map(
        (key) =>
          `<td style="padding: 8px 10px; font-size: 10px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #E5E7EB; text-align: right;">${metricLabels[key] || key}</td>`,
      )
      .join('');

    const rows = displayEntities
      .map((entity) => {
        const cells = metricKeys
          .map((key) => {
            const value = entity.metrics_snapshot?.[key];
            const formatted =
              value !== undefined ? this.formatMetricValue(key, value) : '\u{2014}';
            return `<td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #344054; text-align: right; font-variant-numeric: tabular-nums;">${formatted}</td>`;
          })
          .join('');

        return `
                <tr>
                  <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #344054; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.escapeHtml(entity.entity_name)}
                  </td>
                  ${cells}
                </tr>`;
      })
      .join('');

    return `
          <tr>
            <td style="padding: 8px 40px 24px;">
              <h3 style="margin: 0 0 12px; color: #344054; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                M\u{00E9}tricas no Momento da Execu\u{00E7}\u{00E3}o
              </h3>
              <div style="overflow-x: auto;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; min-width: 400px;">
                  <tr style="background-color: #F9FAFB;">
                    <td style="padding: 8px 10px; font-size: 10px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #E5E7EB;">
                      Entidade
                    </td>
                    ${headerCells}
                  </tr>
                  ${rows}
                </table>
              </div>
              ${withMetrics.length > 5 ? `<p style="margin: 8px 0 0; color: #6B7280; font-size: 12px; text-align: center;">Mostrando 5 de ${withMetrics.length} entidades</p>` : ''}
            </td>
          </tr>`;
  }

  private buildErrorsSection(
    errors: Array<{
      entity_id?: string;
      entity_name?: string;
      task_index?: number;
      action?: string;
      error_message: string;
      timestamp: string;
    }>,
  ): string {
    const displayErrors = errors.slice(0, 10);

    const rows = displayErrors
      .map((err) => {
        const entityInfo = err.entity_name
          ? this.escapeHtml(err.entity_name)
          : 'Geral';

        return `
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #FECACA; font-size: 13px; color: #344054;">
                    ${entityInfo}
                  </td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #FECACA; font-size: 13px; color: #991B1B;">
                    ${this.escapeHtml(err.error_message)}
                  </td>
                </tr>`;
      })
      .join('');

    return `
          <tr>
            <td style="padding: 8px 40px 24px;">
              <h3 style="margin: 0 0 12px; color: #EF4444; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                \u{26A0}\u{FE0F} Erros (${errors.length})
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #FECACA; border-radius: 8px; overflow: hidden; background-color: #FEF2F2;">
                <tr style="background-color: #FEE2E2;">
                  <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #FECACA;">
                    Entidade
                  </td>
                  <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #FECACA;">
                    Erro
                  </td>
                </tr>
                ${rows}
              </table>
              ${errors.length > 10 ? `<p style="margin: 8px 0 0; color: #991B1B; font-size: 12px; text-align: center;">... e mais ${errors.length - 10} erros (veja o log completo no AlvoBot)</p>` : ''}
            </td>
          </tr>`;
  }

  // ============================================
  // PRIVATE: Helpers
  // ============================================

  /**
   * Get status-specific styling configuration for the email banner.
   */
  private getStatusConfig(status: string): StatusConfig {
    switch (status) {
      case 'completed':
        return {
          icon: '\u{2705}',
          label: 'Execu\u{00E7}\u{00E3}o conclu\u{00ED}da com sucesso',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          textColor: '#065F46',
        };
      case 'partial':
        return {
          icon: '\u{26A0}\u{FE0F}',
          label: 'Execu\u{00E7}\u{00E3}o parcial (com erros)',
          bgColor: '#FFFBEB',
          borderColor: '#FDE68A',
          textColor: '#92400E',
        };
      case 'failed':
        return {
          icon: '\u{274C}',
          label: 'Execu\u{00E7}\u{00E3}o falhou',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          textColor: '#991B1B',
        };
      case 'skipped':
        return {
          icon: '\u{23ED}\u{FE0F}',
          label: 'Nenhuma entidade correspondeu',
          bgColor: '#F9FAFB',
          borderColor: '#E5E7EB',
          textColor: '#6B7280',
        };
      default:
        return {
          icon: '\u{2139}\u{FE0F}',
          label: `Status: ${status}`,
          bgColor: '#F9FAFB',
          borderColor: '#E5E7EB',
          textColor: '#344054',
        };
    }
  }

  /**
   * Format a metric value for display.
   * Applies currency formatting for spend-related metrics,
   * percentage for rate metrics, etc.
   */
  private formatMetricValue(key: string, value: number): string {
    const currencyMetrics = [
      'spend',
      'cpc',
      'cpm',
      'cost_per_conversion',
      'cost_per_result',
    ];
    const percentMetrics = ['ctr', 'conversion_rate'];

    if (currencyMetrics.includes(key)) {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (percentMetrics.includes(key)) {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }

    if (key === 'roas') {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
    }

    // Large numbers: use thousand separators
    if (value >= 1000) {
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    }

    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  /**
   * Escape HTML special characters to prevent XSS in email content.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// ============================================
// Internal types
// ============================================

interface StatusConfig {
  icon: string;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}
