import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { TestPromptDto, TestPromptResponse } from "./dto/test-prompt.dto";
import { OpenRouterService } from "../openrouter/openrouter.service";
import type { ModelType } from "../openrouter/dto/openrouter.dto";

interface CreateUserDto {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

interface UpdateUserDto {
  full_name?: string;
  phone?: string;
}

interface BanUserDto {
  banned_until: string | null;
}

interface ChangePasswordDto {
  password: string;
}

interface MagicLinkDto {
  target_user_id: string;
  reason?: string;
}

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  /**
   * Create a new user
   */
  @Post("users")
  async createUser(@Request() req, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(req.user.id, dto);
  }

  /**
   * Update a user
   */
  @Patch("users/:userId")
  async updateUser(
    @Request() req,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(req.user.id, userId, dto);
  }

  /**
   * Change a user's password
   */
  @Post("users/:userId/change-password")
  @HttpCode(HttpStatus.OK)
  async changeUserPassword(
    @Request() req,
    @Param("userId") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.adminService.changeUserPassword(
      req.user.id,
      userId,
      dto.password,
    );
  }

  /**
   * Ban/unban a user
   */
  @Post("users/:userId/ban")
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Request() req,
    @Param("userId") userId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(req.user.id, userId, dto.banned_until);
  }

  /**
   * Delete a user
   */
  @Delete("users/:userId")
  async deleteUser(@Request() req, @Param("userId") userId: string) {
    return this.adminService.deleteUser(req.user.id, userId);
  }

  /**
   * Generate magic link for user impersonation
   */
  @Post("magic-link")
  async generateMagicLink(@Request() req, @Body() dto: MagicLinkDto) {
    return this.adminService.generateMagicLink(req.user.id, dto);
  }

  /**
   * Get audit log
   */
  @Get("audit")
  async getAuditLog(
    @Query("page") page?: string,
    @Query("per_page") perPage?: string,
  ) {
    return this.adminService.getAuditLog(
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 50,
    );
  }

  /**
   * Check if current user is admin
   */
  @Get("check")
  async checkAdmin(@Request() req) {
    const isAdmin = await this.adminService.isAdmin(req.user.id);
    return { is_admin: isAdmin };
  }

  /**
   * Test a system prompt with variables
   * Executes the prompt against OpenAI or OpenRouter and returns the result
   */
  @Post("system-prompts/test")
  @HttpCode(HttpStatus.OK)
  async testPrompt(
    @Request() req,
    @Body() dto: TestPromptDto,
  ): Promise<TestPromptResponse> {
    return this.adminService.testPrompt(req.user.id, dto);
  }

  /**
   * Get available OpenRouter models
   */
  @Get("openrouter/models")
  async getOpenRouterModels(@Query("type") type?: ModelType) {
    return this.openRouterService.fetchModels(type || "all");
  }

  /**
   * Validate OpenRouter API key
   */
  @Post("openrouter/validate-key")
  @HttpCode(HttpStatus.OK)
  async validateOpenRouterKey() {
    return this.openRouterService.validateApiKey();
  }

  /**
   * Get default image generation model
   */
  @Get("settings/image-model")
  async getDefaultImageModel(@Request() req) {
    return this.adminService.getDefaultImageModel(req.user.id);
  }

  /**
   * Update default image generation model
   */
  @Patch("settings/image-model")
  async updateDefaultImageModel(
    @Request() req,
    @Body() dto: { provider: string; model: string },
  ) {
    return this.adminService.setDefaultImageModel(req.user.id, dto);
  }
}
