import { IsString, IsNotEmpty, IsUrl } from "class-validator";

/**
 * DTO for testing WordPress connection
 */
export class TestConnectionDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl(
    { require_protocol: true },
    {
      message: "Domain must be a valid URL with protocol (http:// or https://)",
    },
  )
  domain: string;

  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Response interface for WordPress connection test
 */
export interface WordPressConnectionResponse {
  success: boolean;
  message: string;
  data?: {
    wpVersion: string;
    siteUrl: string;
    siteName: string;
    plugins: Array<{ name: string; version: string; active: boolean }>;
    user: {
      id: number;
      name: string;
      username: string;
      capabilities: string[];
    };
  };
}
