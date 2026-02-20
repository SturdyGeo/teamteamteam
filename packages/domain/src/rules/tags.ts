export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

export function hasTag(tags: string[], tag: string): boolean {
  const normalized = normalizeTag(tag);
  return tags.some((t) => normalizeTag(t) === normalized);
}

export function addTagToList(tags: string[], tag: string): string[] {
  const normalized = normalizeTag(tag);
  if (hasTag(tags, normalized)) return [...tags];
  return [...tags, normalized];
}

export function removeTagFromList(tags: string[], tag: string): string[] {
  const normalized = normalizeTag(tag);
  return tags.filter((t) => normalizeTag(t) !== normalized);
}
