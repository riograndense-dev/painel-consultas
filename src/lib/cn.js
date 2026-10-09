/** Junta classes condicionalmente (strings falsas são ignoradas). */
export function cn(...values) {
  return values.filter(Boolean).join(' ')
}