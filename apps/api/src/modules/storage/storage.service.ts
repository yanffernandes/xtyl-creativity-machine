import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * StorageService wraps Cloudflare R2 (S3-compatible) object storage.
 *
 * Ported from backend/storage_service.py.
 *
 * Environment variables:
 *   - R2_ENDPOINT          (required) Cloudflare R2 endpoint URL
 *   - R2_ACCESS_KEY_ID     (required) S3 access key
 *   - R2_SECRET_ACCESS_KEY (required) S3 secret key
 *   - R2_BUCKET_NAME       (optional, default: xtyl-storage)
 *   - R2_PUBLIC_URL        (optional) Public URL prefix for the bucket
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly endpoint: string;

  constructor() {
    this.endpoint = process.env.R2_ENDPOINT ?? '';
    this.bucketName = process.env.R2_BUCKET_NAME ?? 'xtyl-storage';
    this.publicUrl = process.env.R2_PUBLIC_URL ?? '';
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  onModuleInit() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';

    if (!this.endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 storage not fully configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.',
      );
      return;
    }

    try {
      this.client = new S3Client({
        endpoint: this.endpoint,
        region: 'auto', // Cloudflare R2 uses "auto"
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true, // required for R2
      });
      this.logger.log(`R2 storage service initialized: ${this.endpoint}`);
    } catch (error) {
      this.logger.error(`R2 storage initialization failed: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Upload a file (Buffer or string body) to R2.
   *
   * @param key          Object key (path within the bucket), e.g. "projects/abc/images/file.png".
   * @param body         File content.
   * @param contentType  MIME type (default: application/octet-stream).
   * @returns            The public URL of the uploaded object.
   */
  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    this.ensureClient();

    const normalizedKey = key.replace(/^\/+/, '');

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedKey,
        Body: body,
        ContentType: contentType,
      }),
    );

    return this.getPublicUrl(normalizedKey);
  }

  /**
   * Delete an object from R2.
   *
   * @param key Object key.
   */
  async delete(key: string): Promise<void> {
    this.ensureClient();

    const normalizedKey = key.replace(/^\/+/, '');

    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedKey,
      }),
    );
  }

  /**
   * Download an object from R2.
   *
   * @param key Object key.
   * @returns   The file content as a Buffer.
   */
  async download(key: string): Promise<Buffer> {
    this.ensureClient();

    const normalizedKey = key.replace(/^\/+/, '');

    const response = await this.client!.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedKey,
      }),
    );

    // Convert readable stream to Buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as NodeJS.ReadableStream;
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Generate a pre-signed URL for temporary access to an object.
   *
   * @param key       Object key.
   * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour).
   * @returns         Pre-signed URL string.
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.ensureClient();

    const normalizedKey = key.replace(/^\/+/, '');

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: normalizedKey,
    });

    return getSignedUrl(this.client!, command, { expiresIn });
  }

  /**
   * Construct the public URL for an object.
   *
   * For buckets configured with a custom domain / public access, this returns
   * the direct URL. Otherwise falls back to the endpoint + bucket path.
   */
  getPublicUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '');

    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/+$/, '')}/${normalizedKey}`;
    }

    return `${this.endpoint}/${this.bucketName}/${normalizedKey}`;
  }

  /**
   * Check whether a specific object exists in the bucket.
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    const normalizedKey = key.replace(/^\/+/, '');

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: normalizedKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List objects in the bucket under a given prefix.
   *
   * @param prefix Optional prefix to filter objects.
   * @returns      Array of object keys.
   */
  async listFiles(prefix = ''): Promise<string[]> {
    this.ensureClient();

    const response = await this.client!.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      }),
    );

    return (response.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
  }

  /**
   * Verify that the R2 connection and bucket are accessible.
   */
  async checkConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private ensureClient(): void {
    if (!this.client) {
      throw new Error(
        'R2 storage client not initialized. Check R2 environment variables.',
      );
    }
  }
}
