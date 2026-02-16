import { IsNumber, IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for installing all essential plugins
 */
export class InstallEssentialPluginsDto {
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @IsString()
  @IsNotEmpty()
  token: string;
}

/**
 * Response interface for essential plugins installation
 */
export interface InstallEssentialPluginsResponse {
  totalPlugins: number;
  installed: number;
  failed: number;
  results: Array<{
    slug: string;
    name: string;
    status: "installed" | "error" | "already_installed";
    error?: string;
  }>;
}
