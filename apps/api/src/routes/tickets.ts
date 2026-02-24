import { Hono } from "hono";
import { z } from "zod";
import {
  createTicket,
  updateTicket,
  moveTicket,
  assignTicket,
  closeTicket,
  reopenTicket,
  filterTickets,
  sortTickets,
} from "@teamteamteam/domain";
import { getAuth } from "../middleware/auth.js";
import { enrichTicketWithTags, TICKET_SELECT } from "../lib/tickets.js";
import { persistActivityEvents } from "../lib/activity.js";

const tickets = new Hono();

// --- Query Endpoints ---

tickets.get("/projects/:projectId/tickets", async (c) => {
  const { supabase } = getAuth(c);
  const projectId = c.req.param("projectId");

  let query = supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("project_id", projectId);

  // Apply DB-level filters where possible
  const statusColumnId = c.req.query("status_column_id");
  if (statusColumnId) {
    query = query.eq("status_column_id", statusColumnId);
  }

  const assigneeId = c.req.query("assignee_id");
  if (assigneeId) {
    if (assigneeId === "null") {
      query = query.is("assignee_id", null);
    } else {
      query = query.eq("assignee_id", assigneeId);
    }
  }

  const { data, error } = await query;

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enriched = (data ?? []).map((row: any) => enrichTicketWithTags(row));

  // Apply domain-level filters (tag, search) that can't be done at DB level
  const tag = c.req.query("tag");
  const search = c.req.query("search");
  if (tag || search) {
    enriched = filterTickets(enriched, {
      ...(tag ? { tag } : {}),
      ...(search ? { search } : {}),
    });
  }

  // Sort by updated_at
  const sorted = sortTickets(enriched);

  return c.json(sorted);
});

tickets.get("/tickets/:ticketId", async (c) => {
  const { supabase } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json(enrichTicketWithTags(data as any));
});

// --- Mutation Endpoints ---

const CreateTicketBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

function isDuplicateTicketNumberError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "23505" &&
    typeof error.message === "string" &&
    error.message.includes("tickets_project_id_number_key")
  );
}

tickets.post("/projects/:projectId/tickets", async (c) => {
  const { supabase, user } = getAuth(c);
  const projectId = c.req.param("projectId");

  const body = await c.req.json();
  const parsed = CreateTicketBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0].message,
        },
      },
      400,
    );
  }

  // Get workflow columns for this project
  const { data: columnsData, error: columnsError } = await supabase
    .from("workflow_columns")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (columnsError) {
    return c.json(
      { error: { code: "DB_ERROR", message: columnsError.message } },
      500,
    );
  }

  if (!columnsData || columnsData.length === 0) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Project has no workflow columns",
        },
      },
      400,
    );
  }

  const now = new Date().toISOString();
  const maxInsertAttempts = 5;
  let createdResult: ReturnType<typeof createTicket> | null = null;

  for (let attempt = 1; attempt <= maxInsertAttempts; attempt += 1) {
    // Allocate next ticket number from DB.
    const { data: nextNumber, error: numberError } = await supabase.rpc(
      "next_ticket_number",
      { p_project_id: projectId },
    );

    if (numberError) {
      return c.json(
        { error: { code: "DB_ERROR", message: numberError.message } },
        500,
      );
    }

    const result = createTicket(
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        number: nextNumber,
        title: parsed.data.title,
        description: parsed.data.description,
        assignee_id: parsed.data.assignee_id,
        reporter_id: user.id,
        tags: parsed.data.tags,
        now,
      },
      columnsData,
    );

    // Persist ticket (exclude domain-only `tags` field — tags stored in join table)
    const { error: insertError } = await supabase.from("tickets").insert({
      id: result.data.id,
      project_id: result.data.project_id,
      number: result.data.number,
      title: result.data.title,
      description: result.data.description,
      status_column_id: result.data.status_column_id,
      assignee_id: result.data.assignee_id,
      reporter_id: result.data.reporter_id,
      created_at: result.data.created_at,
      updated_at: result.data.updated_at,
      closed_at: result.data.closed_at,
    });

    if (!insertError) {
      createdResult = result;
      break;
    }

    if (
      isDuplicateTicketNumberError(insertError) &&
      attempt < maxInsertAttempts
    ) {
      continue;
    }

    return c.json(
      { error: { code: "DB_ERROR", message: insertError.message } },
      500,
    );
  }

  if (!createdResult) {
    return c.json(
      {
        error: {
          code: "DB_ERROR",
          message: "Failed to allocate a unique ticket number",
        },
      },
      500,
    );
  }

  // Persist activity events (best-effort)
  await persistActivityEvents(supabase, createdResult.events);

  // Handle tags if provided (best-effort — ticket already created)
  if (parsed.data.tags && parsed.data.tags.length > 0) {
    for (const tagName of createdResult.data.tags) {
      // Upsert tag
      const { data: tagRow, error: tagError } = await supabase
        .from("tags")
        .upsert(
          { project_id: projectId, name: tagName },
          { onConflict: "project_id,name" },
        )
        .select("id")
        .single();

      if (tagError) {
        console.error(`Failed to upsert tag "${tagName}":`, tagError);
        continue;
      }

      if (tagRow) {
        const { error: joinError } = await supabase
          .from("ticket_tags")
          .insert({ ticket_id: createdResult.data.id, tag_id: tagRow.id });
        if (joinError) {
          console.error(`Failed to link tag "${tagName}" to ticket:`, joinError);
        }
      }
    }
  }

  return c.json(createdResult.data, 201);
});

const UpdateTicketBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000),
});

tickets.patch("/tickets/:ticketId", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const body = await c.req.json();
  const parsed = UpdateTicketBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0].message,
        },
      },
      400,
    );
  }

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (ticketError) {
    if (ticketError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: ticketError.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = enrichTicketWithTags(ticketData as any);

  const now = new Date().toISOString();
  const result = updateTicket(ticket, {
    title: parsed.data.title,
    description: parsed.data.description,
    actor_id: user.id,
    now,
  });

  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      title: result.data.title,
      description: result.data.description,
      updated_at: result.data.updated_at,
    })
    .eq("id", ticketId);

  if (updateError) {
    return c.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      500,
    );
  }

  await persistActivityEvents(supabase, result.events);

  return c.json(result.data);
});

const MoveTicketBody = z.object({
  to_column_id: z.string().uuid(),
});

tickets.patch("/tickets/:ticketId/move", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const body = await c.req.json();
  const parsed = MoveTicketBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0].message,
        },
      },
      400,
    );
  }

  // Fetch ticket
  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (ticketError) {
    if (ticketError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: ticketError.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = enrichTicketWithTags(ticketData as any);

  // Fetch columns
  const { data: columnsData, error: columnsError } = await supabase
    .from("workflow_columns")
    .select("*")
    .eq("project_id", ticket.project_id);

  if (columnsError) {
    return c.json(
      { error: { code: "DB_ERROR", message: columnsError.message } },
      500,
    );
  }

  const now = new Date().toISOString();
  const result = moveTicket(
    ticket,
    { to_column_id: parsed.data.to_column_id, actor_id: user.id, now },
    columnsData ?? [],
  );

  // Persist
  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      status_column_id: result.data.status_column_id,
      closed_at: result.data.closed_at,
      updated_at: result.data.updated_at,
    })
    .eq("id", ticketId);

  if (updateError) {
    return c.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      500,
    );
  }

  await persistActivityEvents(supabase, result.events);

  return c.json(result.data);
});

const AssignTicketBody = z.object({
  assignee_id: z.string().uuid().nullable(),
});

tickets.patch("/tickets/:ticketId/assign", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const body = await c.req.json();
  const parsed = AssignTicketBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0].message,
        },
      },
      400,
    );
  }

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (ticketError) {
    if (ticketError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: ticketError.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = enrichTicketWithTags(ticketData as any);

  const now = new Date().toISOString();
  const result = assignTicket(ticket, {
    assignee_id: parsed.data.assignee_id,
    actor_id: user.id,
    now,
  });

  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      assignee_id: result.data.assignee_id,
      updated_at: result.data.updated_at,
    })
    .eq("id", ticketId);

  if (updateError) {
    return c.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      500,
    );
  }

  await persistActivityEvents(supabase, result.events);

  return c.json(result.data);
});

tickets.patch("/tickets/:ticketId/close", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (ticketError) {
    if (ticketError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: ticketError.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = enrichTicketWithTags(ticketData as any);

  const now = new Date().toISOString();
  const result = closeTicket(ticket, {
    actor_id: user.id,
    now,
  });

  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      closed_at: result.data.closed_at,
      updated_at: result.data.updated_at,
    })
    .eq("id", ticketId);

  if (updateError) {
    return c.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      500,
    );
  }

  await persistActivityEvents(supabase, result.events);

  return c.json(result.data);
});

const ReopenTicketBody = z.object({
  to_column_id: z.string().uuid(),
});

tickets.patch("/tickets/:ticketId/reopen", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const body = await c.req.json();
  const parsed = ReopenTicketBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0].message,
        },
      },
      400,
    );
  }

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (ticketError) {
    if (ticketError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: ticketError.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = enrichTicketWithTags(ticketData as any);

  // Fetch columns
  const { data: columnsData, error: columnsError } = await supabase
    .from("workflow_columns")
    .select("*")
    .eq("project_id", ticket.project_id);

  if (columnsError) {
    return c.json(
      { error: { code: "DB_ERROR", message: columnsError.message } },
      500,
    );
  }

  const now = new Date().toISOString();
  const result = reopenTicket(
    ticket,
    { to_column_id: parsed.data.to_column_id, actor_id: user.id, now },
    columnsData ?? [],
  );

  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      status_column_id: result.data.status_column_id,
      closed_at: result.data.closed_at,
      updated_at: result.data.updated_at,
    })
    .eq("id", ticketId);

  if (updateError) {
    return c.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      500,
    );
  }

  await persistActivityEvents(supabase, result.events);

  return c.json(result.data);
});

tickets.delete("/tickets/:ticketId", async (c) => {
  const { supabase } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .single();

  if (ticketError) {
    if (ticketError.code === "PGRST116") {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        404,
      );
    }
    return c.json(
      { error: { code: "DB_ERROR", message: ticketError.message } },
      500,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = enrichTicketWithTags(ticketData as any);

  const { error: deleteError } = await supabase
    .from("tickets")
    .delete()
    .eq("id", ticketId);

  if (deleteError) {
    return c.json(
      { error: { code: "DB_ERROR", message: deleteError.message } },
      500,
    );
  }

  return c.json(ticket);
});

export { tickets };
