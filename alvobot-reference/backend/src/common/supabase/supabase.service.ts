import { Injectable, OnModuleInit } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase service with service_role client for backend operations
 * IMPORTANT: This service uses service_role key and bypasses RLS
 * Only use for operations that require admin access
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in environment variables",
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get the Supabase client instance
   * WARNING: This client has service_role access and bypasses RLS
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get the Supabase client with service_role access
   * Alias for getClient() - used by admin service
   * WARNING: This client bypasses RLS
   */
  getServiceRoleClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Helper method to get projects table
   */
  get projects() {
    return this.supabase.from("projects");
  }

  /**
   * Helper method to get storage bucket
   */
  // Avoid leaking internal class types in declaration output
  storage(bucketName: string): any {
    return this.supabase.storage.from(bucketName);
  }
}
