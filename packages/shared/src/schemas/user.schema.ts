import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(200).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ProfileUpdateSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  isSuperAdmin: z.boolean().default(false),
  isBlocked: z.boolean().default(false),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type Signup = z.infer<typeof SignupSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
