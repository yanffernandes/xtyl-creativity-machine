import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controller
import { AutomationController } from './automation.controller';

// Core services
import { AutomationCrudService } from './services/automation-crud.service';
import { AutomationEngineService } from './services/automation-engine.service';

// Evaluation services
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { FilterEvaluatorService } from './services/filter-evaluator.service';
import { ScheduleEvaluatorService } from './services/schedule-evaluator.service';

// Execution services
import { ActionExecutorService } from './services/action-executor.service';
import { AutomationNotificationService } from './services/notification.service';
import { CustomMetricService } from './services/custom-metric.service';

// Jobs
import { AutomationRunnerJob } from '../../common/jobs/automation-runner.job';

// Platform adapters
import { GoogleAutomationAdapter } from './adapters/google-automation.adapter';
import { MetaAutomationAdapter } from './adapters/meta-automation.adapter';

// External modules
import { GoogleModule } from '../google/google.module';
import { MetaModule } from '../meta/meta.module';
import { ConnectionsModule } from '../connections/connections.module';
import { EmailModule } from '../email/email.module';

/**
 * AutomationModule
 *
 * Unified Ads Automation Engine supporting Google Ads and Meta Ads.
 * Provides CRUD for automation rules, condition evaluation, action execution,
 * schedule management, and notification delivery.
 *
 * Uses forwardRef for GoogleModule, MetaModule, and ConnectionsModule
 * to avoid circular dependency issues.
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => GoogleModule),
    forwardRef(() => MetaModule),
    forwardRef(() => ConnectionsModule),
    EmailModule,
  ],
  controllers: [AutomationController],
  providers: [
    // Core
    AutomationCrudService,
    AutomationEngineService,

    // Evaluation
    ConditionEvaluatorService,
    FilterEvaluatorService,
    ScheduleEvaluatorService,

    // Execution
    ActionExecutorService,
    AutomationNotificationService,
    CustomMetricService,

    // Platform adapters
    GoogleAutomationAdapter,
    MetaAutomationAdapter,

    // Jobs
    AutomationRunnerJob,
  ],
  exports: [AutomationCrudService, AutomationEngineService],
})
export class AutomationModule {}
