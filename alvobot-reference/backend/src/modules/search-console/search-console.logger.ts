import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";

export type ConnectionLogStatus = "success" | "error" | "warning";

@Injectable()
export class SearchConsoleLogger {
  private readonly logger = new Logger(SearchConsoleLogger.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async log(
    connectionId: string,
    action: string,
    status: ConnectionLogStatus,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      const supabase = this.supabaseService.getServiceRoleClient();
      await supabase.from("connection_logs").insert({
        connection_id: connectionId,
        action,
        status,
        message,
        metadata,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write connection log: ${error?.message || error}`,
      );
    }
  }
}
