import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PageSpeedService } from "./pagespeed.service";
import { PageSpeedRepository } from "./pagespeed.repository";
import { PageSpeedNotificationsService } from "./pagespeed.notifications.service";

@Injectable()
export class PageSpeedJobs {
  private readonly logger = new Logger(PageSpeedJobs.name);

  constructor(
    private readonly service: PageSpeedService,
    private readonly repo: PageSpeedRepository,
    private readonly notifications: PageSpeedNotificationsService,
  ) {}

  /**
   * Daily PageSpeed check at 3 AM
   * Processes projects that haven't been checked in 24+ hours
   * Rate limited to prevent API quota exhaustion
   * Sends notifications for poor performance, degradation, or CWV failures
   */
  @Cron("0 3 * * *")
  async dailyPageSpeedCheck() {
    this.logger.log("Starting daily PageSpeed check");

    const projects = await this.repo.listActiveProjects(50);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let notificationsAnalyzed = 0;

    for (const project of projects) {
      // Skip recently checked projects
      if (project.pagespeed_last_check) {
        const lastCheck = new Date(project.pagespeed_last_check).getTime();
        if (lastCheck > cutoff) {
          skipped++;
          continue;
        }
      }

      if (!project.domain) {
        continue;
      }

      try {
        // Get previous scores before the check for comparison
        const previousMobileScore = await this.repo.getPreviousScore(
          project.id,
          "mobile",
        );
        const previousDesktopScore = await this.repo.getPreviousScore(
          project.id,
          "desktop",
        );

        // Perform the PageSpeed check
        const results = await this.service.checkBothStrategies({
          projectId: project.id,
          workspaceId: project.workspace_id,
          domain: project.domain,
          forceCheck: false,
        });
        processed++;

        // Get project details for notifications
        const projectDetails = await this.repo.getProjectWithOwner(project.id);

        if (projectDetails) {
          // Analyze mobile results and send notifications if needed
          try {
            await this.notifications.analyzeAndNotify({
              projectId: project.id,
              projectName: projectDetails.name,
              domain: projectDetails.domain,
              userId: projectDetails.owner_user_id,
              currentResult: results.mobile,
              previousScore: previousMobileScore,
            });

            // Analyze desktop results
            await this.notifications.analyzeAndNotify({
              projectId: project.id,
              projectName: projectDetails.name,
              domain: projectDetails.domain,
              userId: projectDetails.owner_user_id,
              currentResult: results.desktop,
              previousScore: previousDesktopScore,
            });

            notificationsAnalyzed++;
          } catch (notifError) {
            this.logger.warn(
              `Failed to analyze notifications for project ${project.id}:`,
              notifError,
            );
          }
        }

        // Rate limiting: wait 4 seconds between checks (15 req/min)
        // This stays well within the 25 req/100s limit
        await this.delay(4000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `PageSpeed check failed for project ${project.id}: ${errorMessage}`,
        );
        errors++;

        // If quota exceeded, stop processing
        if (errorMessage === "PAGESPEED_QUOTA_EXCEEDED") {
          this.logger.warn("Quota exceeded, stopping daily check");
          break;
        }
      }
    }

    this.logger.log(
      `Daily PageSpeed check complete: ${processed} processed, ${skipped} skipped, ${errors} errors, ${notificationsAnalyzed} notifications analyzed`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
