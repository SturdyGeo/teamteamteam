export function generateTicketKey(prefix: string, number: number): string {
  return `${prefix}-${number}`;
}

export function parseTicketKey(
  key: string,
): { prefix: string; number: number } | null {
  const match = key.match(/^([A-Z][A-Z0-9]*)-(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], number: parseInt(match[2], 10) };
}
