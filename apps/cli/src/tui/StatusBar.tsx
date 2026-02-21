import { Text } from "ink";

interface StatusMessage {
  text: string;
  type: "success" | "error";
}

interface StatusBarProps {
  message: StatusMessage | null;
}

export function StatusBar({ message }: StatusBarProps) {
  if (!message) return null;

  return (
    <Text>
      {message.type === "success" ? (
        <Text color="green">{"\u2713"} {message.text}</Text>
      ) : (
        <Text color="red">{"\u2717"} {message.text}</Text>
      )}
    </Text>
  );
}
