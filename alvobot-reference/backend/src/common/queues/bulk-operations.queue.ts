import { Queue, Job, QueueEvents } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  BulkLocationConfig,
  BulkProductConfig,
  SpreadsheetConfig,
  DuplicateConfig,
} from "../../modules/google/entities/bulk-operation-job.entity";

// Queue names
export const BULK_OPERATIONS_QUEUE = "bulk-operations";

// Job types
export type BulkJobType =
  | "process-bulk-location"
  | "process-bulk-product"
  | "process-spreadsheet"
  | "process-duplicate"
  | "publish-campaign";

// Job data interfaces
export interface BulkLocationJobData {
  jobId: string;
  userId: string;
  connectionId: string;
  config: BulkLocationConfig;
}

export interface BulkProductJobData {
  jobId: string;
  userId: string;
  connectionId: string;
  config: BulkProductConfig;
}

export interface SpreadsheetJobData {
  jobId: string;
  userId: string;
  connectionId: string;
  config: SpreadsheetConfig;
  fileBuffer?: Buffer;
}

export interface DuplicateJobData {
  jobId: string;
  userId: string;
  connectionId: string;
  config: DuplicateConfig;
}

export interface PublishCampaignJobData {
  jobId: string;
  itemId: string;
  userId: string;
  connectionId: string;
  templateId: string;
  dryRun?: boolean;
}

// Union type for all job data
export type BulkOperationJobData =
  | BulkLocationJobData
  | BulkProductJobData
  | SpreadsheetJobData
  | DuplicateJobData
  | PublishCampaignJobData;

// Redis connection options
export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest?: number;
  tls?: Record<string, unknown>;
}

/**
 * Create Redis connection options from environment
 * Supports both regular Redis and Upstash (TLS)
 */
export function createRedisConnection(): RedisConnectionOptions {
  const host = process.env.REDIS_HOST || "localhost";
  const useTls =
    process.env.REDIS_TLS === "true" || host.includes("upstash.io");

  return {
    host,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as any, // Required for BullMQ
    ...(useTls && { tls: {} }), // Enable TLS for Upstash
  };
}

/**
 * Create the bulk operations queue
 */
export function createBulkOperationsQueue(): Queue {
  const connection = createRedisConnection();

  return new Queue(BULK_OPERATIONS_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000, // 5 seconds initial delay
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });
}

/**
 * Create queue events listener
 */
export function createQueueEvents(): QueueEvents {
  const connection = createRedisConnection();
  return new QueueEvents(BULK_OPERATIONS_QUEUE, { connection });
}

/**
 * Job progress callback type
 */
export type ProgressCallback = (
  jobId: string,
  progress: number,
  message?: string,
) => void;

/**
 * Bulk operations queue service
 */
export class BulkOperationsQueueService {
  private readonly logger = new Logger(BulkOperationsQueueService.name);
  private queue: Queue;
  private queueEvents: QueueEvents;

  constructor() {
    this.queue = createBulkOperationsQueue();
    this.queueEvents = createQueueEvents();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    this.queueEvents.on("completed", ({ jobId }) => {
      this.logger.log(`Job ${jobId} completed`);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      this.logger.error(`Job ${jobId} failed: ${failedReason}`);
    });

    this.queueEvents.on("progress", ({ jobId, data }) => {
      this.logger.debug(`Job ${jobId} progress: ${JSON.stringify(data)}`);
    });
  }

  /**
   * Add a bulk location job to the queue
   */
  async addBulkLocationJob(data: BulkLocationJobData): Promise<Job> {
    return this.queue.add("process-bulk-location", data, {
      jobId: `bulk-location-${data.jobId}`,
    });
  }

  /**
   * Add a bulk product job to the queue
   */
  async addBulkProductJob(data: BulkProductJobData): Promise<Job> {
    return this.queue.add("process-bulk-product", data, {
      jobId: `bulk-product-${data.jobId}`,
    });
  }

  /**
   * Add a spreadsheet import job to the queue
   */
  async addSpreadsheetJob(data: SpreadsheetJobData): Promise<Job> {
    return this.queue.add("process-spreadsheet", data, {
      jobId: `spreadsheet-${data.jobId}`,
    });
  }

  /**
   * Add a duplicate job to the queue
   */
  async addDuplicateJob(data: DuplicateJobData): Promise<Job> {
    return this.queue.add("process-duplicate", data, {
      jobId: `duplicate-${data.jobId}`,
    });
  }

  /**
   * Add a campaign publish job to the queue
   */
  async addPublishCampaignJob(data: PublishCampaignJobData): Promise<Job> {
    return this.queue.add("publish-campaign", data, {
      jobId: `publish-${data.itemId}`,
      priority: 1, // Higher priority for publish jobs
    });
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Get job state
   */
  async getJobState(jobId: string): Promise<string | undefined> {
    const job = await this.queue.getJob(jobId);
    return job?.getState();
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.log("Bulk operations queue paused");
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.log("Bulk operations queue resumed");
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === "active") {
      // Can't cancel active jobs directly
      return false;
    }

    await job.remove();
    this.logger.log(`Job ${jobId} cancelled`);
    return true;
  }

  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<void> {
    await this.queue.clean(24 * 3600 * 1000, 100, "completed");
    await this.queue.clean(7 * 24 * 3600 * 1000, 100, "failed");
    this.logger.log("Queue cleanup completed");
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
    this.logger.log("Bulk operations queue closed");
  }
}

// Export singleton instance
let queueServiceInstance: BulkOperationsQueueService | null = null;

export function getBulkOperationsQueueService(): BulkOperationsQueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new BulkOperationsQueueService();
  }
  return queueServiceInstance;
}
