import { Box, Text } from "ink";
import type { TeamteamteamClient } from "@teamteamteam/api-client";
import { Board } from "./Board.js";
import { TicketDetail } from "./TicketDetail.js";
import { SelectList } from "./SelectList.js";
import { TextInput } from "./TextInput.js";
import { StatusBar } from "./StatusBar.js";
import { FilterBar } from "./FilterBar.js";
import { Spinner } from "./Spinner.js";
import { HelpOverlay } from "./HelpOverlay.js";
import { useBoardState } from "./useBoardState.js";

interface AppProps {
  client: TeamteamteamClient;
  projectId: string;
  orgId: string;
  prefix: string;
}

export function App({ client, projectId, orgId, prefix }: AppProps) {
  const state = useBoardState({ client, projectId, orgId });

  if (state.loading) {
    return <Spinner label="Loading board…" />;
  }

  if (state.error) {
    return <Text color="red">Error: {state.error}</Text>;
  }

  if (state.columns.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No columns configured for this project.</Text>
        <Text dimColor>q: quit</Text>
      </Box>
    );
  }

  const { selectedTicket, selectedColumn } = state;

  return (
    <Box flexDirection="column">
      <Board
        columns={state.columns}
        ticketsByColumn={state.ticketsByColumn}
        memberMap={state.memberMap}
        prefix={prefix}
        selectedColumnIndex={state.selectedColumnIndex}
        selectedTicketIndex={state.selectedTicketIndex}
      />
      <FilterBar filters={state.filters} memberMap={state.memberMap} />
      {state.showDetail && selectedTicket && selectedColumn && (
        <TicketDetail
          ticket={selectedTicket}
          columnName={selectedColumn.name}
          assigneeName={
            selectedTicket.assignee_id
              ? (state.memberMap.get(selectedTicket.assignee_id) ??
                selectedTicket.assignee_id)
              : null
          }
          prefix={prefix}
        />
      )}
      {(state.actionMode.type === "move" || state.actionMode.type === "reopen") && (
        <SelectList
          title={state.actionMode.type === "move" ? "Move to" : "Reopen in"}
          items={state.actionMode.options}
          selectedIndex={state.actionMode.selectedIndex}
        />
      )}
      {state.actionMode.type === "assign" && (
        <SelectList
          title="Assign to"
          items={state.actionMode.options.map((o) => ({
            label: o.label,
            value: o.value ?? "null",
          }))}
          selectedIndex={state.actionMode.selectedIndex}
        />
      )}
      {state.actionMode.type === "create" && (
        <Box flexDirection="column">
          {state.actionMode.field === "description" && (
            <Text dimColor>Title: {state.actionMode.title || "(empty)"}</Text>
          )}
          <TextInput
            label={
              state.actionMode.field === "title"
                ? "New Ticket Title"
                : "New Ticket Description"
            }
            value={
              state.actionMode.field === "title"
                ? state.actionMode.title
                : state.actionMode.description
            }
            hint={
              state.actionMode.field === "title"
                ? "type title | enter: next | tab: switch | esc: cancel"
                : "type description | enter: create | tab: switch | esc: cancel"
            }
          />
        </Box>
      )}
      {(state.actionMode.type === "filter-menu" ||
        state.actionMode.type === "filter-assignee" ||
        state.actionMode.type === "filter-tag") && (
        <SelectList
          title={
            state.actionMode.type === "filter-menu"
              ? "Filter by"
              : state.actionMode.type === "filter-assignee"
                ? "Filter by Assignee"
                : "Filter by Tag"
          }
          items={state.actionMode.options}
          selectedIndex={state.actionMode.selectedIndex}
        />
      )}
      {state.actionMode.type === "filter-search" && (
        <TextInput
          label="Search"
          value={state.actionMode.text}
          hint="type to search | enter: apply | esc: cancel"
        />
      )}
      {state.showHelp && <HelpOverlay />}
      <StatusBar message={state.statusMessage} />
      <Box marginTop={1}>
        <Text dimColor>
          {state.showDetail
            ? "esc: close | arrows: navigate | q: quit"
            : state.actionMode.type !== "none"
              ? ""
              : state.hasActiveFilters
                ? "arrows: navigate | enter: details | m: move | a: assign | c: close | o: reopen | n: new | /: filter | r: refresh | esc: clear filters | ?: help | q: quit"
                : "arrows: navigate | enter: details | m: move | a: assign | c: close | o: reopen | n: new | /: filter | r: refresh | ?: help | q: quit"}
        </Text>
      </Box>
    </Box>
  );
}
