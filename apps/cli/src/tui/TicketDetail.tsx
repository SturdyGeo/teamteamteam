import { Box, Text } from "ink";
import type { Ticket } from "@teamteamteam/domain";
import { generateTicketKey } from "@teamteamteam/domain";

interface TicketDetailProps {
  ticket: Ticket;
  columnName: string;
  assigneeName: string | null;
  prefix: string;
}

export function TicketDetail({
  ticket,
  columnName,
  assigneeName,
  prefix,
}: TicketDetailProps) {
  const ticketKey = generateTicketKey(prefix, ticket.number);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Text bold color="cyan">
        {ticketKey} {ticket.title}
      </Text>
      <Text>{ticket.description || "No description"}</Text>
      <Text>
        <Text dimColor>Status: </Text>
        {columnName}
      </Text>
      <Text>
        <Text dimColor>Assignee: </Text>
        {assigneeName ?? "unassigned"}
      </Text>
      {ticket.tags.length > 0 && (
        <Text>
          <Text dimColor>Tags: </Text>
          {ticket.tags.join(", ")}
        </Text>
      )}
      <Text>
        <Text dimColor>Created: </Text>
        {ticket.created_at}
      </Text>
      <Text>
        <Text dimColor>Updated: </Text>
        {ticket.updated_at}
      </Text>
      {ticket.closed_at && (
        <Text>
          <Text dimColor>Closed: </Text>
          {ticket.closed_at}
        </Text>
      )}
    </Box>
  );
}
