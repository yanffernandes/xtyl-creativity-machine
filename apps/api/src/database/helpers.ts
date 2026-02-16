import { isNull, sql } from 'drizzle-orm';

/**
 * Filter for non-deleted records.
 *
 * Usage:
 *   db.select().from(projects).where(isNotDeleted(projects.deletedAt))
 */
export function isNotDeleted(deletedAtColumn: any) {
  return isNull(deletedAtColumn);
}

/**
 * Soft delete: returns an object that sets deleted_at to the current timestamp.
 *
 * Usage:
 *   db.update(projects).set(softDelete()).where(eq(projects.id, id))
 */
export function softDelete() {
  return { deletedAt: sql`now()` };
}
