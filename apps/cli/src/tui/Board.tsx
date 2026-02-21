import { Box, useStdout } from "ink";
import type { WorkflowColumn, Ticket } from "@candoo/domain";
import { Column } from "./Column.js";

interface BoardProps {
  columns: WorkflowColumn[];
  ticketsByColumn: Map<string, Ticket[]>;
  memberMap: Map<string, string>;
  prefix: string;
  selectedColumnIndex?: number;
  selectedTicketIndex?: number;
}

export function Board({
  columns,
  ticketsByColumn,
  memberMap,
  prefix,
  selectedColumnIndex = 0,
  selectedTicketIndex = 0,
}: BoardProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const columnWidth = Math.max(20, Math.floor(termWidth / columns.length));

  return (
    <Box flexDirection="row">
      {columns.map((col, colIndex) => (
        <Column
          key={col.id}
          name={col.name}
          tickets={ticketsByColumn.get(col.id) ?? []}
          prefix={prefix}
          memberMap={memberMap}
          columnWidth={columnWidth}
          isActive={colIndex === selectedColumnIndex}
          selectedTicketIndex={
            colIndex === selectedColumnIndex ? selectedTicketIndex : -1
          }
        />
      ))}
    </Box>
  );
}
