import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { userMemories } from '../../database/drizzle/schema';
import { OpenRouterService } from '../../integrations/openrouter/openrouter.service';
import * as crypto from 'crypto';

interface ListOptions {
  search?: string;
  category?: string;
  limit?: number;
  page?: number;
  perPage?: number;
}

interface SearchOptions {
  limit?: number;
  category?: string;
}

interface UpdateData {
  content?: string;
  category?: string;
}

@Injectable()
export class MemoriesService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async list(userId: string, projectId: string, options: ListOptions = {}) {
    const { search, category, limit, page = 1, perPage = 20 } = options;
    const offset = (page - 1) * perPage;

    let query = this.db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
        ),
      );

    // Apply filters
    if (category) {
      query = query.where(eq(userMemories.category, category));
    }

    if (search) {
      query = query.where(ilike(userMemories.content, `%${search}%`));
    }

    // Order by creation date
    query = query.orderBy(desc(userMemories.createdAt));

    // Count total
    const countQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
          category ? eq(userMemories.category, category) : undefined,
          search ? ilike(userMemories.content, `%${search}%`) : undefined,
        ),
      );

    const [{ count: total }] = await countQuery;

    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    } else {
      query = query.limit(perPage).offset(offset);
    }

    const memories = await query;

    return {
      memories,
      total: Number(total),
    };
  }

  async get(memoryId: string, userId: string, projectId: string) {
    const [memory] = await this.db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.id, memoryId),
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
        ),
      )
      .limit(1);

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    return memory;
  }

  async add(
    userId: string,
    projectId: string,
    content: string,
    category: string = 'other',
  ) {
    // Generate content hash to prevent duplicates
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Check if memory already exists
    const [existing] = await this.db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
          eq(userMemories.contentHash, contentHash),
        ),
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Generate embedding for the content
    const embedding = await this.generateEmbedding(content);

    // Insert new memory
    const [memory] = await this.db
      .insert(userMemories)
      .values({
        userId,
        projectId,
        content,
        contentHash,
        category,
        embedding,
      })
      .returning();

    return memory;
  }

  async update(
    memoryId: string,
    userId: string,
    projectId: string,
    data: UpdateData,
  ) {
    // First check if memory exists
    await this.get(memoryId, userId, projectId);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.content !== undefined) {
      updateData.content = data.content;
      updateData.contentHash = crypto
        .createHash('sha256')
        .update(data.content)
        .digest('hex');
      updateData.embedding = await this.generateEmbedding(data.content);
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    const [updated] = await this.db
      .update(userMemories)
      .set(updateData)
      .where(
        and(
          eq(userMemories.id, memoryId),
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
        ),
      )
      .returning();

    return updated;
  }

  async delete(memoryId: string, userId: string, projectId: string) {
    // First check if memory exists
    await this.get(memoryId, userId, projectId);

    await this.db
      .delete(userMemories)
      .where(
        and(
          eq(userMemories.id, memoryId),
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
        ),
      );

    return true;
  }

  async search(
    query: string,
    userId: string,
    projectId: string,
    options: SearchOptions = {},
  ) {
    const { limit = 10, category } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Convert embedding to pgvector format
    const embeddingString = `[${queryEmbedding.join(',\\\\n')}]`;

    // Semantic search using pgvector cosine similarity
    // 1 - (embedding <=> query_embedding) gives similarity score
    const results = await this.db.execute(sql`
      SELECT
        id,
        user_id,
        project_id,
        content,
        category,
        created_at,
        updated_at,
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM user_memories
      WHERE user_id = ${userId}
        AND project_id = ${projectId}
        ${category ? sql`AND category = ${category}` : sql``}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return results.rows;
  }

  async extractFacts(text: string, projectId: string, userId: string) {
    // Call OpenRouter to extract facts
    const systemPrompt = `You are an AI assistant that extracts important facts and memories from conversation text.
Extract key facts about the user's preferences, goals, professional information, and other relevant details.
Return a JSON array of facts, each with:
- content: The extracted fact (concise, one sentence)
- category: One of: personal, professional, preference, plan, health, other

Example output:
[
  {"content": "User prefers modern minimalist design", "category": "preference"},
  {"content": "Works as a product manager at a tech company", "category": "professional"}
]`;

    const response = await this.openRouterService.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      'anthropic/claude-3.5-sonnet',
      { temperature: 0.3 },
    );

    let facts: Array<{ content: string; category: string }> = [];

    try {
      // Extract JSON from response
      const content = response.choices[0]?.message?.content || '[]';
      // Try to parse JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [
        null,
        content,
      ];
      facts = JSON.parse(jsonMatch[1]);
    } catch (error) {
      console.error('Failed to parse facts from AI response:', error);
      return [];
    }

    // Create memory entries for each fact
    const memories = [];
    for (const fact of facts) {
      try {
        const memory = await this.add(
          userId,
          projectId,
          fact.content,
          fact.category || 'other',
        );
        memories.push(memory);
      } catch (error) {
        console.error('Failed to create memory:', error);
      }
    }

    return memories;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    return this.openRouterService.generateEmbedding(
      text,
      'openai/text-embedding-3-small',
    );
  }
}
