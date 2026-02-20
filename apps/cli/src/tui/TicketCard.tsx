import { Box, Text } from "ink";

interface TicketCardProps {
  ticketKey: string;
  title: string;
  assignee: string | null;
  columnWidth: number;
}

export function TicketCard({
  ticketKey,
  title,
  assignee,
  columnWidth,
}: TicketCardProps) {
  const maxTitleLen = Math.max(10, columnWidth - 4);
  const truncatedTitle =
    title.length > maxTitleLen
      ? title.slice(0, maxTitleLen - 1) + "\u2026"
      : title;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text bold>{ticketKey}</Text>
      </Text>
      <Text>{truncatedTitle}</Text>
      <Text dimColor>{assignee ?? "unassigned"}</Text>
    </Box>
  );
}
