/**
 * Image Generation DTOs
 * Feature 033: Studio Image Quality Improvements
 */

export class GenerateImageBatchDto {
  negative_prompt?: string; // optional, max 500 chars — forwarded to fal.ai models that support it
}
