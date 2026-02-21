import { useState, useEffect, useCallback } from "react";
import { useApp, useInput } from "ink";
import type { WorkflowColumn, Ticket, TicketFilters } from "@teamteamteam/domain";
import { sortColumns, sortTickets, filterTickets } from "@teamteamteam/domain";
import type { TeamteamteamClient, MemberWithUser } from "@teamteamteam/api-client";

interface StatusMessage {
  text: string;
  type: "success" | "error";
}

const ANY_SENTINEL = "__any__";

type ActionMode =
  | { type: "none" }
  | { type: "move"; options: { label: string; value: string }[]; selectedIndex: number }
  | { type: "assign"; options: { label: string; value: string | null }[]; selectedIndex: number }
  | { type: "reopen"; options: { label: string; value: string }[]; selectedIndex: number }
  | { type: "create"; title: string }
  | { type: "filter-menu"; options: { label: string; value: string }[]; selectedIndex: number }
  | { type: "filter-assignee"; options: { label: string; value: string }[]; selectedIndex: number }
  | { type: "filter-tag"; options: { label: string; value: string }[]; selectedIndex: number }
  | { type: "filter-search"; text: string };

interface BoardState {
  loading: boolean;
  error: string | null;
  columns: WorkflowColumn[];
  ticketsByColumn: Map<string, Ticket[]>;
  memberMap: Map<string, string>;
  members: MemberWithUser[];
  selectedColumnIndex: number;
  selectedTicketIndex: number;
  showDetail: boolean;
  showHelp: boolean;
  actionMode: ActionMode;
  statusMessage: StatusMessage | null;
  selectedTicket: Ticket | null;
  selectedColumn: WorkflowColumn | undefined;
  filters: TicketFilters;
  hasActiveFilters: boolean;
}

interface UseBoardStateOptions {
  client: TeamteamteamClient;
  projectId: string;
  orgId: string;
}

export function useBoardState({ client, projectId, orgId }: UseBoardStateOptions): BoardState {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [ticketsByColumn, setTicketsByColumn] = useState<Map<string, Ticket[]>>(new Map());
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [filters, setFilters] = useState<TicketFilters>({});

  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>({ type: "none" });
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const hasActiveFilters = Object.keys(filters).length > 0;

  const refreshBoard = useCallback(async () => {
    try {
      const [cols, tickets, mems] = await Promise.all([
        client.getColumns(projectId),
        client.getTickets(projectId),
        client.getMembers(orgId),
      ]);

      const sorted = sortColumns(cols);
      setColumns(sorted);
      setAllTickets(tickets);

      const mMap = new Map<string, string>();
      for (const m of mems) {
        mMap.set(m.user.id, m.user.display_name || m.user.email);
      }
      setMemberMap(mMap);
      setMembers(mems);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
      setLoading(false);
    }
  }, [client, projectId, orgId]);

  useEffect(() => {
    void refreshBoard();
  }, [refreshBoard]);

  // Reactive grouping: recompute ticketsByColumn when allTickets, columns, or filters change
  useEffect(() => {
    if (columns.length === 0) return;

    const filtered = filterTickets(allTickets, filters);
    const grouped = new Map<string, Ticket[]>();
    for (const col of columns) {
      const colTickets = filtered.filter((t) => t.status_column_id === col.id);
      grouped.set(col.id, sortTickets(colTickets));
    }
    setTicketsByColumn(grouped);

    // Clamp selectedTicketIndex to stay in bounds
    setSelectedTicketIndex((prev) => {
      const col = columns[selectedColumnIndex];
      if (col) {
        const colTickets = grouped.get(col.id) ?? [];
        return Math.min(prev, Math.max(0, colTickets.length - 1));
      }
      return prev;
    });
  }, [allTickets, columns, filters, selectedColumnIndex]);

  // Auto-clear status message after 3 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  async function executeMutation(fn: () => Promise<unknown>, successMsg: string) {
    try {
      await fn();
      await refreshBoard();
      setStatusMessage({ text: successMsg, type: "success" });
    } catch (err) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Action failed", type: "error" });
    }
    setActionMode({ type: "none" });
  }

  // Derive selected ticket
  const selectedColumn = columns[selectedColumnIndex];
  const selectedColTickets = selectedColumn
    ? (ticketsByColumn.get(selectedColumn.id) ?? [])
    : [];
  const selectedTicket = selectedColTickets[selectedTicketIndex] ?? null;

  useInput((input, key) => {
    // Quit — only when not in an action mode
    if (input === "q" && actionMode.type === "none" && !showDetail && !showHelp) {
      exit();
      return;
    }

    if (loading || error) return;

    // Action mode input handling
    if (actionMode.type !== "none") {
      if (key.escape) {
        setActionMode({ type: "none" });
        return;
      }

      if (actionMode.type === "create") {
        if (key.return) {
          if (actionMode.title.trim()) {
            void executeMutation(
              () => client.createTicket(projectId, { title: actionMode.title.trim() }),
              "Ticket created",
            );
          }
          return;
        }
        if (key.backspace || key.delete) {
          setActionMode({ type: "create", title: actionMode.title.slice(0, -1) });
          return;
        }
        if (input.length === 1 && !key.ctrl && !key.meta) {
          setActionMode({ type: "create", title: actionMode.title + input });
          return;
        }
        return;
      }

      // Filter search text input mode
      if (actionMode.type === "filter-search") {
        if (key.return) {
          if (actionMode.text.trim()) {
            setFilters((prev) => ({ ...prev, search: actionMode.text.trim() }));
            setStatusMessage({ text: `Filter: search="${actionMode.text.trim()}"`, type: "success" });
          } else {
            // Empty search clears the search filter
            setFilters(({ search: _search, ...rest }) => rest);
          }
          setActionMode({ type: "none" });
          return;
        }
        if (key.backspace || key.delete) {
          setActionMode({ type: "filter-search", text: actionMode.text.slice(0, -1) });
          return;
        }
        if (input.length === 1 && !key.ctrl && !key.meta) {
          setActionMode({ type: "filter-search", text: actionMode.text + input });
          return;
        }
        return;
      }

      // List modes: move, assign, reopen, filter-menu, filter-assignee, filter-tag
      if (key.upArrow) {
        if (actionMode.selectedIndex > 0) {
          setActionMode({ ...actionMode, selectedIndex: actionMode.selectedIndex - 1 });
        }
        return;
      }
      if (key.downArrow) {
        if (actionMode.selectedIndex < actionMode.options.length - 1) {
          setActionMode({ ...actionMode, selectedIndex: actionMode.selectedIndex + 1 });
        }
        return;
      }
      if (key.return) {
        // Filter menu: transition to sub-mode
        if (actionMode.type === "filter-menu") {
          const selected = actionMode.options[actionMode.selectedIndex];
          if (!selected) return;

          if (selected.value === "assignee") {
            const assigneeOptions: { label: string; value: string }[] = [
              { label: "Any", value: ANY_SENTINEL },
              ...members.map((m) => ({
                label: m.user.display_name || m.user.email,
                value: m.user.id,
              })),
            ];
            setActionMode({ type: "filter-assignee", options: assigneeOptions, selectedIndex: 0 });
          } else if (selected.value === "tag") {
            const uniqueTags = [...new Set(allTickets.flatMap((t) => t.tags))].sort();
            const tagOptions: { label: string; value: string }[] = [
              { label: "Any", value: ANY_SENTINEL },
              ...uniqueTags.map((tag) => ({ label: tag, value: tag })),
            ];
            setActionMode({ type: "filter-tag", options: tagOptions, selectedIndex: 0 });
          } else if (selected.value === "search") {
            setActionMode({ type: "filter-search", text: "" });
          }
          return;
        }

        // Filter assignee confirm
        if (actionMode.type === "filter-assignee") {
          const selected = actionMode.options[actionMode.selectedIndex];
          if (!selected) return;
          if (selected.value === ANY_SENTINEL) {
            setFilters(({ assignee_id: _assignee, ...rest }) => rest);
            setStatusMessage({ text: "Filter cleared: assignee", type: "success" });
          } else {
            setFilters((prev) => ({ ...prev, assignee_id: selected.value }));
            setStatusMessage({ text: `Filter: assignee=${selected.label}`, type: "success" });
          }
          setActionMode({ type: "none" });
          return;
        }

        // Filter tag confirm
        if (actionMode.type === "filter-tag") {
          const selected = actionMode.options[actionMode.selectedIndex];
          if (!selected) return;
          if (selected.value === ANY_SENTINEL) {
            setFilters(({ tag: _tag, ...rest }) => rest);
            setStatusMessage({ text: "Filter cleared: tag", type: "success" });
          } else {
            setFilters((prev) => ({ ...prev, tag: selected.value }));
            setStatusMessage({ text: `Filter: tag=${selected.label}`, type: "success" });
          }
          setActionMode({ type: "none" });
          return;
        }

        // Existing action modes: move, assign, reopen
        if (!selectedTicket) return;

        if (actionMode.type === "move") {
          const selected = actionMode.options[actionMode.selectedIndex];
          if (!selected) return;
          void executeMutation(
            () => client.moveTicket(selectedTicket.id, { to_column_id: selected.value }),
            "Ticket moved",
          );
        } else if (actionMode.type === "assign") {
          const selected = actionMode.options[actionMode.selectedIndex];
          if (!selected) return;
          void executeMutation(
            () => client.assignTicket(selectedTicket.id, { assignee_id: selected.value }),
            selected.value === null ? "Ticket unassigned" : "Ticket assigned",
          );
        } else if (actionMode.type === "reopen") {
          const selected = actionMode.options[actionMode.selectedIndex];
          if (!selected) return;
          void executeMutation(
            () => client.reopenTicket(selectedTicket.id, { to_column_id: selected.value }),
            "Ticket reopened",
          );
        }
        return;
      }
      return;
    }

    // Help overlay — only Escape closes it
    if (showHelp) {
      if (key.escape) {
        setShowHelp(false);
      }
      return;
    }

    // Detail mode — only Escape works
    if (showDetail) {
      if (key.escape) {
        setShowDetail(false);
      }
      return;
    }

    // Board navigation
    if (key.leftArrow) {
      if (selectedColumnIndex > 0) {
        const newColIndex = selectedColumnIndex - 1;
        const newColTickets = ticketsByColumn.get(columns[newColIndex].id) ?? [];
        setSelectedColumnIndex(newColIndex);
        setSelectedTicketIndex(Math.min(selectedTicketIndex, Math.max(0, newColTickets.length - 1)));
      }
    } else if (key.rightArrow) {
      if (selectedColumnIndex < columns.length - 1) {
        const newColIndex = selectedColumnIndex + 1;
        const newColTickets = ticketsByColumn.get(columns[newColIndex].id) ?? [];
        setSelectedColumnIndex(newColIndex);
        setSelectedTicketIndex(Math.min(selectedTicketIndex, Math.max(0, newColTickets.length - 1)));
      }
    } else if (key.upArrow) {
      if (selectedTicketIndex > 0) {
        setSelectedTicketIndex(selectedTicketIndex - 1);
      }
    } else if (key.downArrow) {
      const currentColTickets = ticketsByColumn.get(columns[selectedColumnIndex].id) ?? [];
      if (selectedTicketIndex < currentColTickets.length - 1) {
        setSelectedTicketIndex(selectedTicketIndex + 1);
      }
    } else if (key.return) {
      if (selectedColTickets.length > 0) {
        setShowDetail(true);
      }
    } else if (key.escape) {
      // Clear active filters
      if (hasActiveFilters) {
        setFilters({});
        setStatusMessage({ text: "Filters cleared", type: "success" });
      }
    } else if (input === "/") {
      const filterMenuOptions = [
        { label: "Assignee", value: "assignee" },
        { label: "Tag", value: "tag" },
        { label: "Search", value: "search" },
      ];
      setActionMode({ type: "filter-menu", options: filterMenuOptions, selectedIndex: 0 });
    } else if (input === "r") {
      void refreshBoard().then(() => {
        setStatusMessage({ text: "Board refreshed", type: "success" });
      }).catch((err) => {
        setStatusMessage({ text: err instanceof Error ? err.message : "Refresh failed", type: "error" });
      });
    } else if (input === "m") {
      if (selectedTicket && selectedColumn) {
        const moveOptions = columns
          .filter((col) => col.id !== selectedColumn.id)
          .map((col) => ({ label: col.name, value: col.id }));
        if (moveOptions.length > 0) {
          setActionMode({ type: "move", options: moveOptions, selectedIndex: 0 });
        }
      }
    } else if (input === "a") {
      if (selectedTicket) {
        const assignOptions: { label: string; value: string | null }[] = [
          { label: "Unassign", value: null },
          ...members.map((m) => ({
            label: m.user.display_name || m.user.email,
            value: m.user.id,
          })),
        ];
        setActionMode({ type: "assign", options: assignOptions, selectedIndex: 0 });
      }
    } else if (input === "c") {
      if (selectedTicket) {
        void executeMutation(
          () => client.closeTicket(selectedTicket.id),
          "Ticket closed",
        );
      }
    } else if (input === "o") {
      if (selectedTicket) {
        const reopenOptions = columns.map((col) => ({ label: col.name, value: col.id }));
        setActionMode({ type: "reopen", options: reopenOptions, selectedIndex: 0 });
      }
    } else if (input === "n") {
      setActionMode({ type: "create", title: "" });
    } else if (input === "?") {
      setShowHelp(true);
    }
  });

  return {
    loading,
    error,
    columns,
    ticketsByColumn,
    memberMap,
    members,
    selectedColumnIndex,
    selectedTicketIndex,
    showDetail,
    showHelp,
    actionMode,
    statusMessage,
    selectedTicket,
    selectedColumn,
    filters,
    hasActiveFilters,
  };
}
