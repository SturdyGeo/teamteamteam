import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AuthProvider } from "@/lib/auth";
import { createQueryClient } from "@/lib/query-client";
import { useTelemetryLogger } from "@/lib/telemetry";
import { router } from "@/router";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find #root element");
}

const queryClient = createQueryClient();

function TelemetryBridge(): React.JSX.Element | null {
  useTelemetryLogger();
  return null;
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={{ queryClient }} />
        {import.meta.env.DEV ? <TelemetryBridge /> : null}
        {import.meta.env.DEV ? <ReactQueryDevtools buttonPosition="bottom-left" /> : null}
        {import.meta.env.DEV ? <TanStackRouterDevtools router={router} /> : null}
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
