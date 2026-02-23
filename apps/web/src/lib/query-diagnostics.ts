import { MUTATION_ERROR_EVENT, QUERY_ERROR_EVENT } from "@/lib/telemetry";

interface TelemetryPayload {
  key: string;
  message: string;
  timestamp: string;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function emit(eventType: string, payload: TelemetryPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<TelemetryPayload>(eventType, { detail: payload }));
}

function keyToString(key: readonly unknown[] | undefined): string {
  if (!key || key.length === 0) {
    return "unknown";
  }

  return key
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      return JSON.stringify(part);
    })
    .join(".");
}

export function reportQueryError(error: unknown, key: readonly unknown[]): void {
  emit(QUERY_ERROR_EVENT, {
    key: keyToString(key),
    message: toMessage(error),
    timestamp: new Date().toISOString(),
  });
}

export function reportMutationError(error: unknown, key?: readonly unknown[]): void {
  emit(MUTATION_ERROR_EVENT, {
    key: keyToString(key),
    message: toMessage(error),
    timestamp: new Date().toISOString(),
  });
}
