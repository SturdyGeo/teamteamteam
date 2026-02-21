import { Box, Text } from "ink";

const shortcuts: [string, string][] = [
  ["←/→", "Navigate between columns"],
  ["↑/↓", "Navigate between tickets"],
  ["Enter", "Expand ticket detail"],
  ["n", "Create new ticket"],
  ["m", "Move ticket to column"],
  ["a", "Assign ticket"],
  ["c", "Close ticket"],
  ["o", "Reopen ticket"],
  ["/", "Open filter menu"],
  ["r", "Refresh board"],
  ["Esc", "Close detail / clear filters"],
  ["?", "Show this help"],
  ["q", "Quit"],
];

export function HelpOverlay() {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      <Text bold color="cyan">
        Keyboard Shortcuts
      </Text>
      {shortcuts.map(([key, desc]) => (
        <Text key={key}>
          <Text bold>{key.padEnd(8)}</Text>
          {desc}
        </Text>
      ))}
      <Text dimColor>Press Esc to close</Text>
    </Box>
  );
}
