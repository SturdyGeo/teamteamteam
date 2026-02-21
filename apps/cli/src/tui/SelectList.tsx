import { Box, Text } from "ink";

interface SelectListItem {
  label: string;
  value: string;
}

interface SelectListProps {
  title: string;
  items: SelectListItem[];
  selectedIndex: number;
}

export function SelectList({ title, items, selectedIndex }: SelectListProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="yellow"
      paddingX={1}
    >
      <Text bold color="yellow">
        {title}
      </Text>
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Text key={item.value}>
            {isSelected ? (
              <Text bold color="cyan">
                {">"} {item.label}
              </Text>
            ) : (
              <Text>{"  "}{item.label}</Text>
            )}
          </Text>
        );
      })}
      <Text dimColor>up/down: select | enter: confirm | esc: cancel</Text>
    </Box>
  );
}
