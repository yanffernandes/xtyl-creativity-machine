import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { IsNumber, IsArray, ArrayNotEmpty } from "class-validator";
import { Type } from "class-transformer";
import { WordPressService } from "./wordpress.service";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class SyncArticleUrlDto {
  @IsNumber()
  @Type(() => Number)
  articleId: number;
}

class SyncArticleUrlsBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  articleIds: number[];
}
import { TestConnectionDto } from "./dto/test-connection.dto";
import { InstallEssentialPluginsDto } from "./dto/install-essential-plugins.dto";
import { InstallPluginDto } from "./dto/install-plugin.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Request } from "express";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string; // user_id from JWT
    email?: string;
  };
}

@Controller("wordpress")
export class WordPressController {
  constructor(private readonly wordpressService: WordPressService) {}

  /**
   * Test WordPress connection with provided credentials
   * POST /wordpress/test-connection
   */
  @Post("test-connection")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async testConnection(@Body() dto: TestConnectionDto) {
    return this.wordpressService.testConnection(dto);
  }

  /**
   * Get WordPress site information for an existing project
   * GET /wordpress/site-info/:projectId
   */
  @Get("site-info/:projectId")
  @UseGuards(JwtAuthGuard)
  async getSiteInfo(
    @Param("projectId") projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.wordpressService.getWordPressInfo(Number(projectId), userId);
  }

  /**
   * Install essential plugins on a WordPress project
   * POST /wordpress/install-essential-plugins
   */
  @Post("install-essential-plugins")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async installEssentialPlugins(
    @Body() dto: InstallEssentialPluginsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.wordpressService.installEssentialPlugins(dto, userId);
  }

  /**
   * Install a single plugin on a WordPress project
   * POST /wordpress/install-plugin
   */
  @Post("install-plugin")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async installPlugin(
    @Body() dto: InstallPluginDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.wordpressService.installSinglePlugin(dto, userId);
  }

  /**
   * Get the URL of a specific WordPress post
   * GET /wordpress/post-url/:projectId/:wpPostId
   */
  @Get("post-url/:projectId/:wpPostId")
  @UseGuards(JwtAuthGuard)
  async getPostUrl(
    @Param("projectId") projectId: string,
    @Param("wpPostId") wpPostId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.wordpressService.getPostUrl(
      Number(projectId),
      Number(wpPostId),
      userId,
    );
  }

  /**
   * Fetch URL from WordPress and save it to the article
   * POST /wordpress/sync-article-url
   */
  @Post("sync-article-url")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async syncArticleUrl(
    @Body() body: SyncArticleUrlDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.wordpressService.syncArticleUrl(body.articleId, userId);
  }

  /**
   * Fetch URLs from WordPress and save them to multiple articles
   * POST /wordpress/sync-article-urls-batch
   */
  @Post("sync-article-urls-batch")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async syncArticleUrlsBatch(
    @Body() body: SyncArticleUrlsBatchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.wordpressService.syncArticleUrlsBatch(body.articleIds, userId);
  }
}
