import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * WordPress HTTP client with retry logic and timeout
 */
export class WordPressClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly maxRetries: number = 3;
  private readonly timeout: number = 10000; // 10 seconds

  constructor(domain: string, login: string, password: string) {
    // Normalize domain (ensure it has protocol)
    const baseURL = this.normalizeDomain(domain);

    // Create Basic Auth credentials
    const auth = Buffer.from(`${login}:${password}`).toString("base64");

    this.axiosInstance = axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
    });
  }

  /**
   * Normalize domain to ensure it has a protocol
   */
  private normalizeDomain(domain: string): string {
    if (!domain) {
      throw new Error("Domain cannot be empty");
    }

    let normalized = domain.trim();

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, "");

    // Add https:// if no protocol specified
    if (
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://")
    ) {
      normalized = `https://${normalized}`;
    }

    return normalized;
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, attempt) * 1000;
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make a GET request with retry logic
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry<T>("GET", url, config);
  }

  /**
   * Make a POST request with retry logic
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry<T>("POST", url, { ...config, data });
  }

  /**
   * Make a request with automatic retry on failure
   */
  private async requestWithRetry<T = any>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>({
          method,
          url,
          ...config,
        });

        return response;
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          if (error.response.status !== 429) {
            throw this.normalizeError(error);
          }
        }

        // If this was the last attempt, throw the error
        if (attempt === this.maxRetries - 1) {
          throw this.normalizeError(error);
        }

        // Wait before retrying (exponential backoff)
        const delay = this.getBackoffDelay(attempt);
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw this.normalizeError(lastError);
  }

  /**
   * Normalize errors to a consistent format
   */
  private normalizeError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      switch (status) {
        case 401:
          return new Error(
            `WordPress authentication failed: Invalid credentials (${status})`,
          );
        case 403:
          return new Error(
            `WordPress access forbidden: Insufficient permissions (${status})`,
          );
        case 404:
          return new Error(
            `WordPress endpoint not found: Check if WordPress REST API is enabled (${status})`,
          );
        case 429:
          return new Error(
            `WordPress rate limit exceeded: Too many requests (${status})`,
          );
        case 502:
        case 503:
        case 504:
          return new Error(
            `WordPress server unavailable: ${message || "Service temporarily unavailable"} (${status})`,
          );
        default:
          return new Error(
            `WordPress API error: ${message || "Unknown error"} (${status})`,
          );
      }
    } else if (error.request) {
      // Request was made but no response received (network error, timeout, etc.)
      if (error.code === "ECONNABORTED") {
        return new Error(
          "WordPress request timeout: Server took too long to respond",
        );
      } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        return new Error(
          "WordPress server unreachable: Check domain and network connection",
        );
      } else {
        return new Error(
          `WordPress network error: ${error.message || "Could not connect to server"}`,
        );
      }
    } else {
      // Something else happened
      return new Error(
        `WordPress request error: ${error.message || "Unknown error"}`,
      );
    }
  }
}
