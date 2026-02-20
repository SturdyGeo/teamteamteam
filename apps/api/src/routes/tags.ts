import { Hono } from "hono";
import { z } from "zod";
import { addTag, removeTag, normalizeTag } from "@candoo/domain";
import { getAuth } from "../middleware/auth.js";
import { enrichTicketWithTags, TICKET_SELECT } from "../lib/tickets.js";

const tags = new Hono();

tags.get("/projects/:projectId/tags", async (c) => {
  const { supabase } = getAuth(c);
  const projectId = c.req.param("projectId");

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (error) {
    return c.json(
      { error: { code: "DB_ERROR", message: error.message } },
      500,
    );
  }

  return c.json(data);
});

const AddTagBody = z.object({
  tag: z.string().min(1).max(50),
});

tags.post("/tickets/:ticketId/tags", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");

  const body = await c.req.json();
  const parsed = AddTagBody.safeParse(body);
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

  // Fetch ticket with tags
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
  const result = addTag(ticket, {
    tag: parsed.data.tag,
    actor_id: user.id,
    now,
  });

  // Upsert tag in tags table
  const normalizedName = normalizeTag(parsed.data.tag);
  const { data: tagRow, error: tagUpsertError } = await supabase
    .from("tags")
    .upsert(
      { project_id: ticket.project_id, name: normalizedName },
      { onConflict: "project_id,name" },
    )
    .select("id")
    .single();

  if (tagUpsertError || !tagRow) {
    return c.json(
      {
        error: {
          code: "DB_ERROR",
          message: tagUpsertError?.message ?? "Failed to upsert tag",
        },
      },
      500,
    );
  }

  // Insert into ticket_tags
  const { error: joinError } = await supabase
    .from("ticket_tags")
    .insert({ ticket_id: ticketId, tag_id: tagRow.id });

  if (joinError) {
    return c.json(
      { error: { code: "DB_ERROR", message: joinError.message } },
      500,
    );
  }

  // Insert activity event
  for (const event of result.events) {
    await supabase.from("activity_events").insert(event);
  }

  return c.json(result.data, 201);
});

tags.delete("/tickets/:ticketId/tags/:tag", async (c) => {
  const { supabase, user } = getAuth(c);
  const ticketId = c.req.param("ticketId");
  const tagName = decodeURIComponent(c.req.param("tag"));

  // Fetch ticket with tags
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
  const result = removeTag(ticket, {
    tag: tagName,
    actor_id: user.id,
    now,
  });

  // Find the tag ID
  const normalizedName = normalizeTag(tagName);
  const { data: tagRow, error: tagError } = await supabase
    .from("tags")
    .select("id")
    .eq("project_id", ticket.project_id)
    .eq("name", normalizedName)
    .single();

  if (tagError || !tagRow) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Tag not found" } },
      404,
    );
  }

  // Delete from ticket_tags
  const { error: deleteError } = await supabase
    .from("ticket_tags")
    .delete()
    .eq("ticket_id", ticketId)
    .eq("tag_id", tagRow.id);

  if (deleteError) {
    return c.json(
      { error: { code: "DB_ERROR", message: deleteError.message } },
      500,
    );
  }

  // Insert activity event
  for (const event of result.events) {
    await supabase.from("activity_events").insert(event);
  }

  return c.json(result.data);
});

export { tags };
