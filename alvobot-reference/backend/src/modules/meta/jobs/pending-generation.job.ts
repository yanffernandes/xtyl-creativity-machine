/**
 * PendingGenerationJob - Cron job that processes pending image generations
 *
 * Runs every 30 seconds to:
 * 1. Check pending generations with the image provider (Replicate)
 * 2. Upload completed images to storage and save to creative library
 * 3. Mark failed/expired generations
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ReplicateService } from "../../replicate/replicate.service";
import { AiCreativeService } from "../services/ai-creative.service";
import { ImageFormat } from "../dto/generate-image.dto";

interface PendingGenerationRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  article_id: number | null;
  provider: string;
  provider_prediction_id: string;
  model: string;
  prompt: string;
  format: string;
  status: string;
  image_url: string | null;
  storage_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string;
  metadata: Record<string, unknown>;
  last_checked_at: string | null;
  check_count: number;
}

@Injectable()
export class PendingGenerationJob {
  private readonly logger = new Logger(PendingGenerationJob.name);
  private readonly supabase: SupabaseClient;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly replicateService: ReplicateService,
    private readonly aiCreativeService: AiCreativeService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Run every 30 seconds to process pending image generations
   */
  @Cron("*/30 * * * * *")
  async processPendingGenerations(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug("Skipping - previous run still in progress");
      return;
    }

    this.isRunning = true;

    try {
      // 1. Fetch pending generations that haven't expired
      const pending = await this.getPendingGenerations();

      if (pending.length === 0) {
        return;
      }

      this.logger.log(
        `Processing ${pending.length} pending image generation(s)`,
      );

      // 2. Process in batches (max 5 concurrent)
      await this.processInBatches(pending, 5);

      // 3. Expire old generations (> 10 min since creation)
      await this.expireOldGenerations();
    } catch (error) {
      this.logger.error(
        `Error in pending generation job: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch all pending generations that haven't expired
   */
  private async getPendingGenerations(): Promise<PendingGenerationRow[]> {
    const { data, error } = await this.supabase
      .from("pending_image_generations")
      .select("*")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(20); // Process max 20 at a time

    if (error) {
      this.logger.error(
        `Failed to fetch pending generations: ${error.message}`,
      );
      return [];
    }

    return (data || []) as PendingGenerationRow[];
  }

  /**
   * Process pending generations in batches with limited concurrency
   */
  private async processInBatches(
    records: PendingGenerationRow[],
    batchSize: number,
  ): Promise<void> {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((record) => this.checkAndUpdate(record)),
      );
    }
  }

  /**
   * Check a single pending generation with the provider and update status
   */
  private async checkAndUpdate(record: PendingGenerationRow): Promise<void> {
    try {
      // Update check timestamp
      await this.updateCheckTimestamp(record.id);

      if (record.provider === "replicate") {
        const result = await this.replicateService.checkPrediction(
          record.provider_prediction_id,
        );

        if (result.status === "completed") {
          // Image is ready - upload to storage and save to library
          await this.completeGeneration(record, result);
        } else if (result.status === "pending") {
          // Still processing - just log
          this.logger.debug(
            `Pending generation ${record.id} still processing (prediction: ${record.provider_prediction_id})`,
          );
        }
      } else {
        this.logger.warn(
          `Unsupported provider: ${record.provider} for pending generation ${record.id}`,
        );
        await this.markFailed(
          record.id,
          `Provider ${record.provider} não suportado para verificação automática`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's a final error (failed/not found/expired)
      if (
        errorMessage.includes("failed") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("expired") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("content policy")
      ) {
        this.logger.warn(
          `Pending generation ${record.id} failed permanently: ${errorMessage}`,
        );
        await this.markFailed(record.id, errorMessage);
      } else {
        // Transient error - log and continue
        this.logger.debug(
          `Transient error checking pending generation ${record.id}: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Complete a generation: upload image to storage and save to creative library
   */
  private async completeGeneration(
    record: PendingGenerationRow,
    result: { imageBase64: string; mimeType: string },
  ): Promise<void> {
    try {
      // 1. Upload to storage
      const filename = `creative_pending_${record.id}_${Date.now()}.png`;
      const storage = await this.aiCreativeService.uploadImageToStorage(
        result.imageBase64,
        result.mimeType,
        record.user_id,
        filename,
      );

      // 2. Update pending record as completed
      const { error: updateError } = await this.supabase
        .from("pending_image_generations")
        .update({
          status: "completed",
          image_url: storage.url,
          storage_path: storage.path,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (updateError) {
        this.logger.error(
          `Failed to update pending generation ${record.id}: ${updateError.message}`,
        );
        return;
      }

      // 3. Save to creative library
      if (record.article_id) {
        const formatMap: Record<string, ImageFormat> = {
          "1:1": ImageFormat.SQUARE,
          "9:16": ImageFormat.STORY,
          "16:9": ImageFormat.LANDSCAPE,
        };
        const format = formatMap[record.format] || ImageFormat.SQUARE;

        await this.aiCreativeService.saveToLibrary(
          record.user_id,
          record.workspace_id,
          storage.url,
          storage.path,
          record.article_id,
          record.model,
          "photorealistic",
          record.prompt,
          format,
        );
      }

      this.logger.log(
        `Pending generation ${record.id} completed successfully - image uploaded to ${storage.url}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete generation ${record.id}: ${error instanceof Error ? error.message : error}`,
      );
      await this.markFailed(
        record.id,
        `Erro ao processar imagem completada: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    }
  }

  /**
   * Mark a pending generation as failed
   */
  private async markFailed(id: string, errorMessage: string): Promise<void> {
    const { error } = await this.supabase
      .from("pending_image_generations")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      this.logger.error(
        `Failed to mark generation ${id} as failed: ${error.message}`,
      );
    }
  }

  /**
   * Update the last_checked_at timestamp and increment check_count
   */
  private async updateCheckTimestamp(id: string): Promise<void> {
    const { error } = await this.supabase.rpc("increment_pending_check_count", {
      pending_id: id,
    });

    // Fallback if RPC doesn't exist
    if (error) {
      await this.supabase
        .from("pending_image_generations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
  }

  /**
   * Expire pending generations older than 10 minutes
   */
  private async expireOldGenerations(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("pending_image_generations")
      .update({
        status: "expired",
        error_message: "Geração expirou após 10 minutos sem resposta",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "pending")
      .lt("created_at", tenMinutesAgo)
      .select("id");

    if (error) {
      this.logger.error(`Failed to expire old generations: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      this.logger.log(`Expired ${data.length} old pending generation(s)`);
    }
  }
}
