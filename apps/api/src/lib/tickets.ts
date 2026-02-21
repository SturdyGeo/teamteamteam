import type { Ticket } from "@candoo/domain";

interface TicketTagRow {
  tags: { name: string };
}

interface RawTicketRow {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status_column_id: string;
  assignee_id: string | null;
  reporter_id: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  ticket_tags?: TicketTagRow[];
}

export function enrichTicketWithTags(raw: RawTicketRow): Ticket {
  const tags = (raw.ticket_tags ?? []).map(
    (tt: TicketTagRow) => tt.tags.name,
  );

  const { ticket_tags: _ticketTags, ...rest } = raw;
  return { ...rest, tags } as Ticket;
}

export const TICKET_SELECT =
  "id, project_id, number, title, description, status_column_id, assignee_id, reporter_id, created_at, updated_at, closed_at, ticket_tags(tags(name))";
