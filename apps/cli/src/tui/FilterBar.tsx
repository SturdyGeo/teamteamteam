import { Text } from "ink";
import type { TicketFilters } from "@teamteamteam/domain";

interface FilterBarProps {
  filters: TicketFilters;
  memberMap: Map<string, string>;
}

export function FilterBar({ filters, memberMap }: FilterBarProps) {
  const parts: string[] = [];

  if (filters.assignee_id !== undefined) {
    if (filters.assignee_id === null) {
      parts.push("assignee=Unassigned");
    } else {
      const name = memberMap.get(filters.assignee_id) ?? filters.assignee_id;
      parts.push(`assignee=${name}`);
    }
  }

  if (filters.tag !== undefined) {
    parts.push(`tag=${filters.tag}`);
  }

  if (filters.search !== undefined) {
    parts.push(`search="${filters.search}"`);
  }

  if (parts.length === 0) return null;

  return (
    <Text color="magenta">
      Filters: {parts.join(" | ")}   (esc to clear)
    </Text>
  );
}
