export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Escapes SQL LIKE/ILIKE wildcards (%, _, \) so a search term is matched literally. */
export function escapeLikeWildcards(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}
