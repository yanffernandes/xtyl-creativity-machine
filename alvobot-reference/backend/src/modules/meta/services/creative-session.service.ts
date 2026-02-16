/**
 * Creative Session Service
 * Manages real-time generation sessions for SSE streaming
 */

import { Injectable, Logger } from "@nestjs/common";
import { Subject } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import {
  AnyCreativeStreamEvent,
  CreativeSlotDto,
  CreativeSlotStatus,
  InitCreativeGenerationDto,
} from "../dto/creative-stream.dto";

/**
 * Internal session structure
 */
interface GenerationSession {
  sessionId: string;
  userId: string;
  totalImages: number;
  slots: Map<string, CreativeSlotDto>;
  subject: Subject<AnyCreativeStreamEvent>;
  createdAt: Date;
  completedAt?: Date;
  // Tracking
  generatedCount: number;
  failedCount: number;
  pendingCount: number;
}

@Injectable()
export class CreativeSessionService {
  private readonly logger = new Logger(CreativeSessionService.name);
  private readonly sessions = new Map<string, GenerationSession>();

  // Clean up old sessions after 1 hour
  private readonly SESSION_TTL_MS = 60 * 60 * 1000;

  constructor() {
    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanupOldSessions(), 5 * 60 * 1000);
  }

  /**
   * Create a new generation session
   */
  createSession(
    userId: string,
    dto: InitCreativeGenerationDto,
    conceptSequence: Array<{ id: string; slug: string; name: string }>,
  ): GenerationSession {
    const sessionId = uuidv4();
    const slots = new Map<string, CreativeSlotDto>();

    // Pre-create slots for each image
    for (let i = 0; i < dto.count; i++) {
      const imageId = uuidv4();
      const articleIndex = i % dto.articles.length;
      const concept = conceptSequence[i];

      slots.set(imageId, {
        imageId,
        index: i,
        status: "queued",
        articleId: dto.articles[articleIndex].id,
        conceptName: concept?.name,
        conceptSlug: concept?.slug,
      });
    }

    const session: GenerationSession = {
      sessionId,
      userId,
      totalImages: dto.count,
      slots,
      subject: new Subject<AnyCreativeStreamEvent>(),
      createdAt: new Date(),
      generatedCount: 0,
      failedCount: 0,
      pendingCount: 0,
    };

    this.sessions.set(sessionId, session);
    this.logger.log(
      `Created generation session ${sessionId} for user ${userId} with ${dto.count} images`,
    );

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GenerationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get session slots as sorted array
   */
  getSessionSlots(sessionId: string): CreativeSlotDto[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.slots.values()).sort((a, b) => a.index - b.index);
  }

  /**
   * Get a specific slot by imageId
   */
  getSlot(sessionId: string, imageId: string): CreativeSlotDto | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return session.slots.get(imageId);
  }

  /**
   * Emit event to session subscribers
   */
  emitEvent(sessionId: string, event: AnyCreativeStreamEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(
        `Attempted to emit event to non-existent session ${sessionId}`,
      );
      return;
    }

    session.subject.next(event);

    // Update slot status based on event type
    if ("imageId" in event) {
      const slot = session.slots.get(event.imageId);
      if (slot) {
        switch (event.type) {
          case "generating":
            slot.status = "generating";
            if ("model" in event) {
              slot.modelUsed = event.model;
            }
            break;
          case "completed":
            slot.status = "completed";
            session.generatedCount++;
            break;
          case "failed":
            slot.status = "failed";
            if ("isPending" in event && event.isPending) {
              session.pendingCount++;
            } else {
              session.failedCount++;
            }
            break;
          case "retrying":
            slot.status = "retrying";
            break;
        }
      }
    }

    // Mark session as completed when done
    if (event.type === "done") {
      session.completedAt = new Date();
    }
  }

  /**
   * Get observable for session events
   */
  getSessionObservable(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return session.subject.asObservable();
  }

  /**
   * Update slot status
   */
  updateSlotStatus(
    sessionId: string,
    imageId: string,
    status: CreativeSlotStatus,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const slot = session.slots.get(imageId);
    if (slot) {
      slot.status = status;
    }
  }

  /**
   * Update slot with completed data
   */
  updateSlotCompleted(
    sessionId: string,
    imageId: string,
    data: {
      imageUrl: string;
      storagePath: string;
      modelUsed: string;
      backgroundStyle?: string;
      promptUsed: string;
      libraryId: string;
      conceptUsed?: { id: string; slug: string; name: string };
    },
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const slot = session.slots.get(imageId);
    if (!slot) return;

    Object.assign(slot, {
      status: "completed" as const,
      imageUrl: data.imageUrl,
      storagePath: data.storagePath,
      modelUsed: data.modelUsed,
      backgroundStyle: data.backgroundStyle,
      promptUsed: data.promptUsed,
      libraryId: data.libraryId,
      conceptUsed: data.conceptUsed,
      // Clear error info
      error: undefined,
      canRetry: undefined,
      isPending: undefined,
      pendingId: undefined,
    });
  }

  /**
   * Update slot with failure data
   */
  updateSlotFailed(
    sessionId: string,
    imageId: string,
    data: {
      error: string;
      canRetry: boolean;
      isPending: boolean;
      pendingId?: string;
    },
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const slot = session.slots.get(imageId);
    if (!slot) return;

    Object.assign(slot, {
      status: "failed" as const,
      error: data.error,
      canRetry: data.canRetry,
      isPending: data.isPending,
      pendingId: data.pendingId,
    });
  }

  /**
   * Update slot with retry info
   */
  updateSlotRetrying(
    sessionId: string,
    imageId: string,
    attempt: number,
    maxAttempts: number,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const slot = session.slots.get(imageId);
    if (!slot) return;

    Object.assign(slot, {
      status: "retrying" as const,
      retryAttempt: attempt,
      maxRetryAttempts: maxAttempts,
      // Clear previous error
      error: undefined,
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    totalImages: number;
    generatedCount: number;
    failedCount: number;
    pendingCount: number;
    queuedCount: number;
    generatingCount: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    let queuedCount = 0;
    let generatingCount = 0;

    for (const slot of session.slots.values()) {
      if (slot.status === "queued") queuedCount++;
      if (slot.status === "generating" || slot.status === "retrying")
        generatingCount++;
    }

    return {
      totalImages: session.totalImages,
      generatedCount: session.generatedCount,
      failedCount: session.failedCount,
      pendingCount: session.pendingCount,
      queuedCount,
      generatingCount,
    };
  }

  /**
   * Clean up old sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.createdAt.getTime();
      if (age > this.SESSION_TTL_MS) {
        session.subject.complete();
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} old generation sessions`);
    }
  }

  /**
   * Close session and clean up
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.subject.complete();
      this.sessions.delete(sessionId);
      this.logger.log(`Closed generation session ${sessionId}`);
    }
  }

  /**
   * Check if session belongs to user
   */
  isSessionOwner(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.userId === userId;
  }

  /**
   * Check if session is completed
   */
  isSessionCompleted(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.completedAt !== undefined;
  }
}
