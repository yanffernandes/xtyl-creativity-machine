import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { BaseStructureService } from "./base-structure.service";
import {
  GenerateNichesDto,
  GenerateNichesResponseDto,
} from "./dto/generate-niches.dto";
import {
  GenerateCategoriesDto,
  GenerateCategoriesResponseDto,
} from "./dto/generate-categories.dto";
import {
  GenerateTitlesDto,
  GenerateTitlesResponseDto,
} from "./dto/generate-titles.dto";
import {
  SaveStructureDto,
  SaveStructureResponseDto,
} from "./dto/save-structure.dto";
import {
  GenerateArrowArticleDto,
  GenerateArrowArticleResponseDto,
} from "./dto/generate-arrow-article.dto";
import {
  GenerateBaseArticleDto,
  GenerateBaseArticleResponseDto,
} from "./dto/generate-base-article.dto";

interface AuthenticatedRequest extends Request {
  user: { sub: string; email: string };
}

@ApiTags("Base Structure")
@Controller("base-structure")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BaseStructureController {
  constructor(private readonly baseStructureService: BaseStructureService) {}

  @Get("wordpress-categories")
  @ApiOperation({
    summary: "Get existing WordPress categories",
    description:
      "Fetches categories already created in the WordPress site for the given project.",
  })
  @ApiQuery({
    name: "projectId",
    type: Number,
    description: "Project ID to fetch categories from",
  })
  @ApiResponse({
    status: 200,
    description: "Categories fetched successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async getWordPressCategories(
    @Query("projectId") projectId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ categories: { name: string; slug: string }[] }> {
    const userId = req.user.sub;
    const categories = await this.baseStructureService.getWordPressCategories(
      projectId,
      userId,
    );
    return { categories };
  }

  @Post("generate-niches")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate niche suggestions using AI",
    description:
      "Uses GPT-4o-mini to generate 10 ultra-specific niche suggestions based on language and optional domain context.",
  })
  @ApiResponse({
    status: 200,
    description: "Niche suggestions generated successfully",
    type: GenerateNichesResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "AI generation failed" })
  async generateNiches(
    @Body() dto: GenerateNichesDto,
  ): Promise<GenerateNichesResponseDto> {
    const startTime = Date.now();
    const niches = await this.baseStructureService.generateNiches(
      dto.language,
      dto.domain,
    );
    return {
      niches,
      processingTime: Date.now() - startTime,
    };
  }

  @Post("generate-categories")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate categories for a niche",
    description:
      "Uses GPT-4o-mini to generate 12 categories organized in 3 groups of 4, based on the selected niche.",
  })
  @ApiResponse({
    status: 200,
    description: "Categories generated successfully",
    type: GenerateCategoriesResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "AI generation failed" })
  async generateCategories(
    @Body() dto: GenerateCategoriesDto,
  ): Promise<GenerateCategoriesResponseDto> {
    const startTime = Date.now();
    const categories = await this.baseStructureService.generateCategories(
      dto.niche,
    );
    return {
      categories,
      processingTime: Date.now() - startTime,
    };
  }

  @Post("generate-titles")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate article titles using 4-layer technique",
    description:
      "Uses GPT-4o-mini to generate 30-45 SEO-optimized article titles using the 4-layer hypersegmentation technique.",
  })
  @ApiResponse({
    status: 200,
    description: "Titles generated successfully",
    type: GenerateTitlesResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "AI generation failed" })
  async generateTitles(
    @Body() dto: GenerateTitlesDto,
  ): Promise<GenerateTitlesResponseDto> {
    const startTime = Date.now();
    const titles = await this.baseStructureService.generateTitles(
      dto.niche,
      dto.categories,
    );
    return {
      titles,
      processingTime: Date.now() - startTime,
    };
  }

  @Post("save")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Save structure to WordPress and Supabase",
    description:
      "Saves the complete base structure including categories, articles, and optionally creates author, logo, and updates blog title.",
  })
  @ApiResponse({
    status: 200,
    description: "Structure saved successfully",
    type: SaveStructureResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  @ApiResponse({ status: 500, description: "Save operation failed" })
  async saveStructure(
    @Body() dto: SaveStructureDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SaveStructureResponseDto> {
    const userId = req.user.sub;
    return this.baseStructureService.saveStructure(dto, userId);
  }

  @Post("generate-arrow-article")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate arrow article content from keyword",
    description:
      "Uses AI to generate complete article content (title, excerpt, and body) based on a keyword.",
  })
  @ApiResponse({
    status: 200,
    description: "Article content generated successfully",
    type: GenerateArrowArticleResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "AI generation failed" })
  async generateArrowArticle(
    @Body() dto: GenerateArrowArticleDto,
  ): Promise<GenerateArrowArticleResponseDto> {
    const startTime = Date.now();
    const content = await this.baseStructureService.generateArrowArticleContent(
      dto.keyword,
      dto.title,
      dto.excerpt,
      dto.language,
      dto.country,
    );
    return {
      ...content,
      processingTime: Date.now() - startTime,
    };
  }

  @Post("generate-base-article")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate base article content from title",
    description:
      "Uses AI to generate complete article content (body and excerpt) based on a title.",
  })
  @ApiResponse({
    status: 200,
    description: "Article content generated successfully",
    type: GenerateBaseArticleResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "AI generation failed" })
  async generateBaseArticle(
    @Body() dto: GenerateBaseArticleDto,
  ): Promise<GenerateBaseArticleResponseDto> {
    const startTime = Date.now();
    const content = await this.baseStructureService.generateBaseArticleContent(
      dto.title,
      dto.excerpt,
    );
    return {
      ...content,
      processingTime: Date.now() - startTime,
    };
  }
}
