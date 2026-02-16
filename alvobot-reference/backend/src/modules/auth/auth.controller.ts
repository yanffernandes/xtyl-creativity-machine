import { Controller, Post, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  @Post("validate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validate Supabase JWT token" })
  @ApiResponse({
    status: 200,
    description: "Token is valid",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean", example: true },
        user: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            email: { type: "string", example: "user@example.com" },
            role: { type: "string", example: "authenticated" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async validate(@Request() req) {
    return {
      valid: true,
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
    };
  }
}
