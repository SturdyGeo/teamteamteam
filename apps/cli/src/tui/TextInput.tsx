import { Box, Text } from "ink";

interface TextInputProps {
  label: string;
  value: string;
  hint?: string;
}

export function TextInput({ label, value, hint = "type title | enter: create | esc: cancel" }: TextInputProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="green"
      paddingX={1}
    >
      <Text bold color="green">
        {label}
      </Text>
      <Text>{value}_</Text>
      <Text dimColor>{hint}</Text>
    </Box>
  );
}
