import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ConfigService } from "@nestjs/config";

/**
 * WorkspaceGuard - Validates that the user has access to the workspace
 * specified in the x-workspace-id header.
 *
 * Usage:
 *   @UseGuards(AuthGuard('jwt'), WorkspaceGuard)
 *
 * This guard:
 * 1. Reads x-workspace-id from request headers
 * 2. Verifies the authenticated user is an active member of that workspace
 * 3. Attaches workspace_id to req.workspaceId for downstream use
 *
 * If no x-workspace-id header is present, the guard passes through
 * (for endpoints that don't require workspace context).
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceGuard.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey =
      this.configService.get<string>("SUPABASE_SERVICE_KEY");

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const workspaceId =
      request.headers["x-workspace-id"] as string | undefined;

    // If no workspace header, pass through (endpoint doesn't require workspace)
    if (!workspaceId) {
      return true;
    }

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    // Verify user is an active member of the workspace
    const { data: membership, error } = await this.supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !membership) {
      this.logger.warn(
        `User ${userId} denied access to workspace ${workspaceId}`,
      );
      throw new ForbiddenException(
        "Você não tem acesso a este workspace",
      );
    }

    // Attach workspace info to request for downstream use
    request.workspaceId = workspaceId;
    request.workspaceRole = membership.role;

    return true;
  }
}

/**
 * Helper to extract workspaceId from request.
 * Checks: req.workspaceId (set by guard), then x-workspace-id header,
 * then body.workspaceId, then body.workspace_id, then query.workspaceId,
 * then query.workspace_id.
 */
export function extractWorkspaceId(req: any): string | undefined {
  return (
    req.workspaceId ||
    req.headers?.["x-workspace-id"] ||
    req.body?.workspaceId ||
    req.body?.workspace_id ||
    req.query?.workspaceId ||
    req.query?.workspace_id
  );
}
