import { Box, Text, useApp, useInput } from "ink";
import { useState, useEffect } from "react";
import type { WorkflowColumn, Ticket } from "@candoo/domain";
import { sortColumns, sortTickets } from "@candoo/domain";
import type { CandooClient } from "@candoo/api-client";
import { Board } from "./Board.js";

interface AppProps {
  client: CandooClient;
  projectId: string;
  orgId: string;
  prefix: string;
}

export function App({ client, projectId, orgId, prefix }: AppProps) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [ticketsByColumn, setTicketsByColumn] = useState<Map<string, Ticket[]>>(
    new Map(),
  );
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());

  useInput((input) => {
    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [cols, tickets, members] = await Promise.all([
          client.getColumns(projectId),
          client.getTickets(projectId),
          client.getMembers(orgId),
        ]);

        const sorted = sortColumns(cols);
        setColumns(sorted);

        const grouped = new Map<string, Ticket[]>();
        for (const col of sorted) {
          const colTickets = tickets.filter(
            (t) => t.status_column_id === col.id,
          );
          grouped.set(col.id, sortTickets(colTickets));
        }
        setTicketsByColumn(grouped);

        const mMap = new Map<string, string>();
        for (const m of members) {
          mMap.set(m.user.id, m.user.display_name || m.user.email);
        }
        setMemberMap(mMap);

        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load board",
        );
        setLoading(false);
      }
    }

    void fetchData();
  }, [client, projectId, orgId]);

  if (loading) {
    return <Text>Loading board\u2026</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  return (
    <Box flexDirection="column">
      <Board
        columns={columns}
        ticketsByColumn={ticketsByColumn}
        memberMap={memberMap}
        prefix={prefix}
      />
      <Box marginTop={1}>
        <Text dimColor>Press q to quit</Text>
      </Box>
    </Box>
  );
}
