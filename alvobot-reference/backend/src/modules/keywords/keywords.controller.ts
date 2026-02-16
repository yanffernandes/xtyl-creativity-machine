import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  HttpException,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { KeywordsService } from "./keywords.service";
import {
  MineKeywordsDto,
  MineKeywordsResponseDto,
} from "./dto/mine-keywords.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Keywords")
@Controller("keywords")
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Post("mine")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Mine keywords using Google Keyword Insight",
    description:
      "Uses RapidAPI Google Keyword Insight to mine keywords. " +
      "If keyword is empty, uses existing user keywords as reference for AI suggestions.",
  })
  @ApiResponse({
    status: 200,
    description: "Keywords mined successfully",
    type: MineKeywordsResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 500, description: "Mining failed" })
  async mineKeywords(
    @Body() dto: MineKeywordsDto,
    @Req() req: { user: { sub: string } },
  ): Promise<MineKeywordsResponseDto> {
    const userId = req.user.sub;
    const serviceResponse = await this.keywordsService.mineKeywords(
      dto,
      userId,
    );

    // If mining failed, throw an error
    if (!serviceResponse.success) {
      throw new HttpException(
        serviceResponse.error || "Failed to mine keywords",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Transform to frontend expected format
    return {
      keywords: serviceResponse.results,
      total: serviceResponse.results.length,
      seed_keyword: dto.keyword || "AI generated",
    };
  }
}
