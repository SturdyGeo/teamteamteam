import { Box, Text } from "ink";

interface TicketCardProps {
  ticketKey: string;
  title: string;
  assignee: string | null;
  columnWidth: number;
  isSelected?: boolean;
}

export function TicketCard({
  ticketKey,
  title,
  assignee,
  columnWidth,
  isSelected = false,
}: TicketCardProps) {
  const maxTitleLen = Math.max(10, columnWidth - 4);
  const truncatedTitle =
    title.length > maxTitleLen
      ? title.slice(0, maxTitleLen - 1) + "\u2026"
      : title;

  const content = (
    <Box flexDirection="column">
      <Text>
        <Text bold color={isSelected ? "cyan" : undefined}>
          {ticketKey}
        </Text>
      </Text>
      <Text>{truncatedTitle}</Text>
      <Text dimColor>{assignee ?? "unassigned"}</Text>
    </Box>
  );

  if (isSelected) {
    return (
      <Box
        borderStyle="round"
        borderColor="cyan"
        marginBottom={1}
        flexDirection="column"
      >
        {content}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {content}
    </Box>
  );
}
