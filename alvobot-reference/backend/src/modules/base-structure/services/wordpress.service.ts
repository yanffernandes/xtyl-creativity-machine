import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthorData,
  LogoConfig,
  BlogSettings,
  WordPressCategory,
} from "../types";

@Injectable()
export class WordPressService {
  private readonly logger = new Logger(WordPressService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Create Basic Auth header for WordPress API
   */
  private getAuthHeader(token: string): string {
    const credentials = `alvobot:${token}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  /**
   * Get existing categories from WordPress
   */
  async getCategories(
    wpUrl: string,
    token: string,
  ): Promise<WordPressCategory[]> {
    this.logger.debug(`Fetching categories from ${wpUrl}`);
    const authHeader = this.getAuthHeader(token);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${wpUrl}/wp-json/wp/v2/categories`, {
          headers: { Authorization: authHeader },
          params: {
            per_page: 100, // Get up to 100 categories
            hide_empty: false, // Include empty categories
          },
        }),
      );

      const categories: WordPressCategory[] = response.data
        .filter((cat: any) => cat.slug !== "uncategorized") // Exclude default category
        .map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }));

      this.logger.debug(`Found ${categories.length} categories`);
      return categories;
    } catch (error: any) {
      this.logger.error("Failed to fetch categories:", error.message);
      throw error;
    }
  }

  /**
   * Create categories on WordPress (or find existing ones)
   */
  async createCategories(
    wpUrl: string,
    token: string,
    categories: string[],
  ): Promise<WordPressCategory[]> {
    this.logger.debug(`Creating ${categories.length} categories on ${wpUrl}`);

    const resultCategories: WordPressCategory[] = [];
    const authHeader = this.getAuthHeader(token);

    for (const categoryName of categories) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(
            `${wpUrl}/wp-json/wp/v2/categories`,
            {
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
            },
            {
              headers: { Authorization: authHeader },
            },
          ),
        );

        resultCategories.push({
          id: response.data.id,
          name: response.data.name,
          slug: response.data.slug,
        });

        this.logger.debug(`Created category: ${categoryName}`);
      } catch (error: any) {
        // Category might already exist, try to find it
        if (error.response?.status === 400) {
          this.logger.debug(
            `Category "${categoryName}" might already exist, searching...`,
          );
          try {
            // Search for the existing category by slug
            const slug = categoryName.toLowerCase().replace(/\s+/g, "-");
            const searchResponse = await firstValueFrom(
              this.httpService.get(`${wpUrl}/wp-json/wp/v2/categories`, {
                headers: { Authorization: authHeader },
                params: { slug, per_page: 1 },
              }),
            );

            if (searchResponse.data && searchResponse.data.length > 0) {
              const existingCat = searchResponse.data[0];
              resultCategories.push({
                id: existingCat.id,
                name: existingCat.name,
                slug: existingCat.slug,
              });
              this.logger.debug(
                `Found existing category: ${categoryName} (id: ${existingCat.id})`,
              );
            }
          } catch (searchError: any) {
            this.logger.warn(
              `Could not find existing category "${categoryName}": ${searchError.message}`,
            );
          }
          continue;
        }
        this.logger.error(
          `Failed to create category "${categoryName}":`,
          error.message,
        );
      }
    }

    return resultCategories;
  }

  /**
   * Update author profile on WordPress
   */
  async updateAuthor(
    wpUrl: string,
    token: string,
    author: AuthorData,
    imageBase64?: string,
  ): Promise<void> {
    this.logger.debug(`Updating author on ${wpUrl}`);

    try {
      await firstValueFrom(
        this.httpService.put(
          `${wpUrl}/wp-json/alvobot-pro/v1/authors/alvobot`,
          {
            token,
            username: "alvobot",
            display_name: author.name,
            description: author.description,
            ...(imageBase64 && { author_image: imageBase64 }),
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );

      this.logger.debug("Author updated successfully");
    } catch (error: any) {
      this.logger.error("Failed to update author:", error.message);
      throw error;
    }
  }

  /**
   * Create logo on WordPress
   */
  async createLogo(
    wpUrl: string,
    token: string,
    config: LogoConfig,
    blogName: string,
  ): Promise<void> {
    this.logger.debug(`Creating logo on ${wpUrl}`);

    try {
      await firstValueFrom(
        this.httpService.post(
          `${wpUrl}/wp-json/alvobot-pro/v1/logos`,
          {
            token,
            blog_name: blogName,
            save_to_media: "true",
            apply_to_site: "true",
            generate_favicon: "true",
            icon_choice: config.icon,
            font_choice: config.font,
            font_color: "#ffffff",
            background_color: "#000000",
          },
          {
            headers: {
              Authorization: this.getAuthHeader(token),
              "Content-Type": "application/json",
            },
          },
        ),
      );

      this.logger.debug("Logo created successfully");
    } catch (error: any) {
      this.logger.error("Failed to create logo:", error.message);
      throw error;
    }
  }

  /**
   * Update WordPress site settings (title and description)
   */
  async updateSettings(
    wpUrl: string,
    token: string,
    settings: BlogSettings,
  ): Promise<void> {
    this.logger.debug(`Updating settings on ${wpUrl}`);

    const authHeader = this.getAuthHeader(token);

    try {
      await firstValueFrom(
        this.httpService.put(
          `${wpUrl}/wp-json/wp/v2/settings`,
          {
            title: settings.title,
            description: settings.description,
          },
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      this.logger.debug("Settings updated successfully");
    } catch (error: any) {
      this.logger.error("Failed to update settings:", error.message);
      throw error;
    }
  }

  /**
   * Get current WordPress settings
   */
  async getSettings(wpUrl: string, token: string): Promise<BlogSettings> {
    const authHeader = this.getAuthHeader(token);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${wpUrl}/wp-json/wp/v2/settings`, {
          headers: { Authorization: authHeader },
        }),
      );

      return {
        title: response.data.title,
        description: response.data.description,
      };
    } catch (error: any) {
      this.logger.error("Failed to get settings:", error.message);
      throw error;
    }
  }
}
