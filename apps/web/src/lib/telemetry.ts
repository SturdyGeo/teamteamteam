import { useEffect } from "react";

export const QUERY_ERROR_EVENT = "teamteamteam:web:query-error";
export const MUTATION_ERROR_EVENT = "teamteamteam:web:mutation-error";

interface TelemetryDetail {
  key: string;
  message: string;
  timestamp: string;
}

function toLogPrefix(eventType: string): string {
  if (eventType === QUERY_ERROR_EVENT) {
    return "[query-error]";
  }

  return "[mutation-error]";
}

export function useTelemetryLogger(): void {
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return;
    }

    const handleEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<TelemetryDetail>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      console.warn(
        `${toLogPrefix(customEvent.type)} key=${detail.key} message=${detail.message}`,
      );
    };

    window.addEventListener(QUERY_ERROR_EVENT, handleEvent as EventListener);
    window.addEventListener(MUTATION_ERROR_EVENT, handleEvent as EventListener);

    return () => {
      window.removeEventListener(QUERY_ERROR_EVENT, handleEvent as EventListener);
      window.removeEventListener(MUTATION_ERROR_EVENT, handleEvent as EventListener);
    };
  }, []);
}
