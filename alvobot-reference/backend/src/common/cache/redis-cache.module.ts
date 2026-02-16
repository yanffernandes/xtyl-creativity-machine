import { Module, Global, Logger } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";
import { RevenueCacheService } from "./revenue-cache.service";

/**
 * Global Redis Cache Module
 *
 * Provides a Redis-backed cache for the entire application.
 * Falls back to in-memory cache if Redis is not available.
 *
 * Features:
 * - Persistent cache (survives server restarts)
 * - Shared across all instances (horizontal scaling)
 * - Pattern-based invalidation support
 * - Intelligent TTL based on data type
 *
 * Environment variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_TLS: Enable TLS for Upstash etc (default: false)
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("RedisCacheModule");

        const host = configService.get<string>("REDIS_HOST") || "localhost";
        const port = configService.get<number>("REDIS_PORT") || 6379;
        const password = configService.get<string>("REDIS_PASSWORD");
        const useTls =
          configService.get<string>("REDIS_TLS") === "true" ||
          host.includes("upstash.io");

        // Build Redis URL
        const protocol = useTls ? "rediss" : "redis";
        const auth = password ? `:${password}@` : "";
        const redisUrl = `${protocol}://${auth}${host}:${port}`;

        try {
          // Create Keyv instance with Redis store
          const keyvRedis = new KeyvRedis(redisUrl, {
            // Use namespace instead of keyPrefix for @keyv/redis v5
            namespace: "alvobot",
            keyPrefixSeparator: ":",
          });

          const keyv = new Keyv({ store: keyvRedis });

          // Test connection with timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error("Redis connection timeout")),
              5000,
            );
          });

          const testResult = await Promise.race([
            (async () => {
              await keyv.set("__test__", "ok", 1000);
              return keyv.get("__test__");
            })(),
            timeoutPromise,
          ]);

          if (testResult === "ok") {
            logger.log(`Redis cache connected successfully to ${host}:${port}`);
            await keyv.delete("__test__");

            return {
              stores: [keyv],
              ttl: 15 * 60 * 1000, // Default 15 minutes
            };
          } else {
            throw new Error("Redis test failed");
          }
        } catch (error) {
          logger.warn(
            `Failed to connect to Redis (${host}:${port}): ${error.message}`,
          );
          logger.warn("Falling back to in-memory cache");

          // Fallback to in-memory cache
          return {
            ttl: 15 * 60 * 1000, // Default 15 minutes
            max: 1000, // In-memory limit
          };
        }
      },
    }),
  ],
  providers: [RevenueCacheService],
  exports: [CacheModule, RevenueCacheService],
})
export class RedisCacheModule {}
