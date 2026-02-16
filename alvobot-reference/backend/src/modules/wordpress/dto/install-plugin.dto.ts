import { IsNumber, IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for installing a single plugin
 */
export class InstallPluginDto {
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @IsString()
  @IsNotEmpty()
  pluginSlug: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

/**
 * Response interface for plugin installation
 */
export interface PluginInstallResponse {
  slug: string;
  name: string;
  status: "installed" | "error" | "already_installed";
  error?: string;
}
