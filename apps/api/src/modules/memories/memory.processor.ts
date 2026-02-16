import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { MemoriesService } from './memories.service';

interface MemoryExtractionJob {
  text: string;
  projectId: string;
  userId: string;
  conversationId?: string;
}

@Processor('memory-extraction', { concurrency: 2 })
@Injectable()
export class MemoryProcessor extends WorkerHost {
  constructor(private readonly memoriesService: MemoriesService) {
    super();
  }

  async process(job: Job<MemoryExtractionJob>) {
    const { text, projectId, userId } = job.data;

    try {
      await job.updateProgress(10);

      // Extract facts from the conversation text
      const memories = await this.memoriesService.extractFacts(
        text,
        projectId,
        userId,
      );

      await job.updateProgress(100);

      return {
        success: true,
        memoriesCreated: memories.length,
        memories,
      };
    } catch (error) {
      console.error('Memory extraction failed:', error);
      throw error;
    }
  }
}
