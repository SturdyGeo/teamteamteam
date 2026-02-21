import { Box, Text } from "ink";
import type { Ticket } from "@candoo/domain";
import { generateTicketKey } from "@candoo/domain";
import { TicketCard } from "./TicketCard.js";

interface ColumnProps {
  name: string;
  tickets: Ticket[];
  prefix: string;
  memberMap: Map<string, string>;
  columnWidth: number;
  isActive?: boolean;
  selectedTicketIndex?: number;
}

export function Column({
  name,
  tickets,
  prefix,
  memberMap,
  columnWidth,
  isActive = false,
  selectedTicketIndex = -1,
}: ColumnProps) {
  return (
    <Box flexDirection="column" width={columnWidth}>
      <Text bold color={isActive ? "cyan" : undefined}>
        {name}
      </Text>
      <Text dimColor>
        {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
      </Text>
      <Text dimColor>{"\u2500".repeat(Math.max(1, columnWidth - 2))}</Text>
      {tickets.length === 0 ? (
        <Text dimColor>No tickets</Text>
      ) : (
        tickets.map((t, i) => (
          <TicketCard
            key={t.id}
            ticketKey={generateTicketKey(prefix, t.number)}
            title={t.title}
            assignee={
              t.assignee_id
                ? (memberMap.get(t.assignee_id) ?? t.assignee_id)
                : null
            }
            columnWidth={columnWidth}
            isSelected={isActive && i === selectedTicketIndex}
          />
        ))
      )}
    </Box>
  );
}
