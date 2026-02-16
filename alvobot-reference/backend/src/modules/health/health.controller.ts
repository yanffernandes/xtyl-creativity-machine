import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { getSupabase } from "../../temporal/activities/supabase.activities";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Comprehensive health check" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "healthy" },
        timestamp: { type: "string", example: "2025-12-04T15:00:00Z" },
        uptime: { type: "number", example: 120 },
        version: { type: "string", example: "1.0.0" },
        dependencies: {
          type: "object",
          properties: {
            supabase: {
              type: "object",
              properties: {
                status: { type: "string", example: "healthy" },
                responseTime: { type: "number", example: 45 },
              },
            },
          },
        },
      },
    },
  })
  async check() {
    // Check Supabase connection
    let supabaseStatus = "healthy";
    let supabaseResponseTime = 0;

    try {
      const dbStart = Date.now();
      const supabase = getSupabase();
      await supabase.from("projects").select("id").limit(1);
      supabaseResponseTime = Date.now() - dbStart;
    } catch {
      supabaseStatus = "unhealthy";
    }

    return {
      status: supabaseStatus === "healthy" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      dependencies: {
        supabase: {
          status: supabaseStatus,
          responseTime: supabaseResponseTime,
        },
      },
    };
  }
}
