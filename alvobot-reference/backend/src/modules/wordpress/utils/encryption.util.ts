import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Encryption utility for WordPress credentials
 * Uses AES-256-GCM encryption
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH = 16; // For GCM mode
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Get encryption key from environment variable
   */
  private static getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }
    if (key.length !== 64) {
      // 32 bytes = 64 hex characters
      throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }
    return Buffer.from(key, "hex");
  }

  /**
   * Encrypt a string value
   * @param plaintext - The text to encrypt
   * @returns Encrypted text in format: iv:authTag:encrypted (all base64)
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error("Cannot encrypt empty string");
    }

    const key = this.getKey();
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted (all base64)
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * @param ciphertext - The encrypted text in format: iv:authTag:encrypted
   * @returns Decrypted plaintext
   */
  static decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new Error("Cannot decrypt empty string");
    }

    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      throw new Error(
        "Invalid encrypted format. Expected: iv:authTag:encrypted",
      );
    }

    const [ivBase64, authTagBase64, encryptedBase64] = parts;
    const key = this.getKey();
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  }

  /**
   * Test if a string is encrypted (has the correct format)
   */
  static isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(":");
    return parts.length === 3;
  }
}
