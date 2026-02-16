// Slug generation utility
// Feature: 027-courses-system

/**
 * Generate a URL-friendly slug from a title
 * @param title - Title to convert to slug
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    // Remove accents/diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Generate a unique slug by appending a number if needed
 * @param title - Title to convert to slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 */
export function generateUniqueSlug(title: string, existingSlugs: string[]): string {
  const baseSlug = generateSlug(title);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}
