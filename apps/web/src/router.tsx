import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { filterTickets, sortColumns, sortTickets, type Ticket } from "@teamteamteam/domain";
import { useOrgMembersQuery, useOrgProjectsQuery } from "@/features/orgs/hooks";
import { orgMembersQueryOptions, orgProjectsQueryOptions, orgsQueryOptions } from "@/features/orgs/queries";
import {
  useProjectColumnsQuery,
  useProjectTicketQuery,
  useProjectTagsQuery,
  useProjectTicketsQuery,
} from "@/features/projects/hooks";
import {
  projectColumnsQueryOptions,
  projectTagsQueryOptions,
  projectTicketsQueryOptions,
} from "@/features/projects/queries";
import { HomePage } from "@/routes/home-page";
import { LoginPage } from "@/routes/login-page";
import { AuthCallbackPage } from "@/routes/auth-callback-page";
import { RootLayout } from "@/routes/root-layout";
import { OrgsPage } from "@/routes/orgs-page";
import { OrgPage } from "@/routes/org-page";
import { ProjectPage } from "@/routes/project-page";
import { NotFoundPage, RouteErrorBoundary } from "@/routes/error-boundary";
import { supabase } from "@/lib/supabase";

interface RouterContext {
  queryClient: QueryClient;
}

type OrgSort = "name_asc" | "name_desc";
type ProjectSort = "priority" | "updated_desc" | "updated_asc" | "title_asc";

interface OrgsUrlState {
  query: string;
  sort: OrgSort;
  page: number;
  pageSize: number;
}

interface ProjectUrlState {
  query: string;
  tag: string;
  assigneeId: string;
  statusColumnId: string;
  ticketId: string;
  sort: ProjectSort;
  page: number;
  pageSize: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parsePageSize(value: string | null): number {
  const parsed = Number(value);
  if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return parsed;
  }

  return 25;
}

function parseOrgsUrlState(params: URLSearchParams): OrgsUrlState {
  const sort = params.get("sort");
  return {
    query: (params.get("query") ?? "").trim(),
    sort: sort === "name_desc" ? "name_desc" : "name_asc",
    page: parsePositiveInt(params.get("page"), 1),
    pageSize: parsePageSize(params.get("pageSize")),
  };
}

function parseProjectUrlState(params: URLSearchParams): ProjectUrlState {
  const sort = params.get("sort");
  return {
    query: (params.get("query") ?? "").trim(),
    tag: (params.get("tag") ?? "").trim(),
    assigneeId: (params.get("assigneeId") ?? "").trim(),
    statusColumnId: (params.get("statusColumnId") ?? "").trim(),
    ticketId: (params.get("ticketId") ?? "").trim(),
    sort:
      sort === "updated_desc" ||
      sort === "updated_asc" ||
      sort === "title_asc"
        ? sort
        : "priority",
    page: parsePositiveInt(params.get("page"), 1),
    pageSize: parsePageSize(params.get("pageSize")),
  };
}

function paramsFromHref(href: string): URLSearchParams {
  const queryIndex = href.indexOf("?");
  if (queryIndex === -1) {
    return new URLSearchParams();
  }

  return new URLSearchParams(href.slice(queryIndex + 1));
}

function sortProjectTickets(tickets: Ticket[], sort: ProjectSort): Ticket[] {
  if (sort === "priority" || sort === "updated_desc") {
    return sortTickets(tickets);
  }

  const copy = [...tickets];

  if (sort === "updated_asc") {
    return copy.sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );
  }

  return copy.sort((a, b) => a.title.localeCompare(b.title));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

async function requireSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw redirect({ to: "/login" });
  }
}

async function redirectIfAuthenticated(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    throw redirect({ to: "/orgs" });
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
  errorComponent: RouteErrorBoundary,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: redirectIfAuthenticated,
  component: LoginPage,
  errorComponent: RouteErrorBoundary,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  beforeLoad: redirectIfAuthenticated,
  component: AuthCallbackPage,
  errorComponent: RouteErrorBoundary,
});

const orgsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs",
  beforeLoad: requireSession,
  loader: async ({ context }) => {
    const orgs = await context.queryClient.ensureQueryData(orgsQueryOptions());
    return { orgs };
  },
  component: OrgsRouteComponent,
  errorComponent: RouteErrorBoundary,
});

function OrgsRouteComponent(): React.JSX.Element {
  const navigate = useNavigate({ from: orgsRoute.fullPath });
  const href = useRouterState({ select: (state) => state.location.href });
  const urlState = useMemo(() => parseOrgsUrlState(paramsFromHref(href)), [href]);
  const { orgs } = orgsRoute.useLoaderData();

  const filteredOrgs = useMemo(() => {
    const filtered = orgs.filter((org) =>
      urlState.query ? org.name.toLowerCase().includes(urlState.query.toLowerCase()) : true,
    );

    return [...filtered].sort((a, b) => {
      if (urlState.sort === "name_desc") {
        return b.name.localeCompare(a.name);
      }

      return a.name.localeCompare(b.name);
    });
  }, [orgs, urlState.query, urlState.sort]);

  const totalOrgs = filteredOrgs.length;
  const totalPages = Math.max(1, Math.ceil(totalOrgs / urlState.pageSize));
  const currentPage = Math.min(urlState.page, totalPages);
  const start = (currentPage - 1) * urlState.pageSize;
  const pagedOrgs = filteredOrgs.slice(start, start + urlState.pageSize);

  function updateUrlState(
    patch: Partial<OrgsUrlState>,
    options?: { resetPage?: boolean },
  ): void {
    const resetPage = options?.resetPage ?? true;
    const nextState: OrgsUrlState = {
      query: patch.query ?? urlState.query,
      sort: patch.sort ?? urlState.sort,
      page: resetPage ? 1 : (patch.page ?? urlState.page),
      pageSize: patch.pageSize ?? urlState.pageSize,
    };

    void navigate({
      to: ".",
      search: nextState as never,
    });
  }

  return (
    <OrgsPage
      orgs={pagedOrgs}
      totalOrgs={totalOrgs}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={urlState.pageSize}
      query={urlState.query}
      sort={urlState.sort}
      onQueryChange={(query) => updateUrlState({ query })}
      onSortChange={(sort) => updateUrlState({ sort })}
      onPageSizeChange={(pageSize) => updateUrlState({ pageSize })}
      onPrevPage={() => {
        if (currentPage > 1) {
          updateUrlState({ page: currentPage - 1 }, { resetPage: false });
        }
      }}
      onNextPage={() => {
        if (currentPage < totalPages) {
          updateUrlState({ page: currentPage + 1 }, { resetPage: false });
        }
      }}
    />
  );
}

const orgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId",
  beforeLoad: async ({ params }) => {
    await requireSession();
    if (!isUuid(params.orgId)) {
      throw redirect({ to: "/orgs" });
    }
  },
  loader: async ({ context, params }) => {
    const orgs = await context.queryClient.ensureQueryData(orgsQueryOptions());

    const org = orgs.find((item) => item.id === params.orgId);
    if (!org) {
      throw redirect({ to: "/orgs" });
    }

    const [projects, members] = await Promise.all([
      context.queryClient.ensureQueryData(orgProjectsQueryOptions(params.orgId)),
      context.queryClient.ensureQueryData(orgMembersQueryOptions(params.orgId)),
    ]);

    return {
      org,
      projects,
      members,
    };
  },
  component: OrgRouteComponent,
  errorComponent: RouteErrorBoundary,
});

function OrgRouteComponent(): React.JSX.Element {
  const { org, projects, members } = orgRoute.useLoaderData();
  const liveProjectsQuery = useOrgProjectsQuery(org.id);
  const liveMembersQuery = useOrgMembersQuery(org.id);

  const currentProjects = liveProjectsQuery.data ?? projects;
  const currentMembers = liveMembersQuery.data ?? members;

  return (
    <OrgPage
      orgId={org.id}
      orgName={org.name}
      projects={currentProjects}
      members={currentMembers}
    />
  );
}

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId/projects/$projectId",
  beforeLoad: async ({ params }) => {
    await requireSession();
    if (!isUuid(params.orgId) || !isUuid(params.projectId)) {
      throw redirect({ to: "/orgs" });
    }
  },
  loader: async ({ context, params }) => {
    const orgs = await context.queryClient.ensureQueryData(orgsQueryOptions());
    const org = orgs.find((item) => item.id === params.orgId);
    if (!org) {
      throw redirect({ to: "/orgs" });
    }

    const [projects, columns, tickets, tags, members] = await Promise.all([
      context.queryClient.ensureQueryData(orgProjectsQueryOptions(params.orgId)),
      context.queryClient.ensureQueryData(projectColumnsQueryOptions(params.projectId)),
      context.queryClient.ensureQueryData(projectTicketsQueryOptions(params.projectId)),
      context.queryClient.ensureQueryData(projectTagsQueryOptions(params.projectId)),
      context.queryClient.ensureQueryData(orgMembersQueryOptions(params.orgId)),
    ]);

    const project = projects.find((item) => item.id === params.projectId);
    if (!project) {
      throw redirect({
        to: "/orgs/$orgId",
        params: { orgId: params.orgId },
      });
    }

    return {
      project,
      columns,
      tickets,
      tags,
      members,
    };
  },
  component: ProjectRouteComponent,
  errorComponent: RouteErrorBoundary,
});

function ProjectRouteComponent(): React.JSX.Element {
  const navigate = useNavigate({ from: projectRoute.fullPath });
  const href = useRouterState({ select: (state) => state.location.href });
  const urlState = useMemo(() => parseProjectUrlState(paramsFromHref(href)), [href]);
  const selectedTicketId = urlState.ticketId || null;

  const { project, columns, tickets, tags, members } = projectRoute.useLoaderData();
  const liveColumnsQuery = useProjectColumnsQuery(project.id);
  const liveTicketsQuery = useProjectTicketsQuery(project.id);
  const liveTagsQuery = useProjectTagsQuery(project.id);
  const liveTicketQuery = useProjectTicketQuery(selectedTicketId, Boolean(selectedTicketId));

  const currentColumns = sortColumns(liveColumnsQuery.data ?? columns);
  const currentTickets = liveTicketsQuery.data ?? tickets;
  const currentTags = liveTagsQuery.data ?? tags;

  const filteredTickets = useMemo(() => {
    const filtered = filterTickets(currentTickets, {
      status_column_id: urlState.statusColumnId || undefined,
      assignee_id:
        urlState.assigneeId === "unassigned"
          ? null
          : (urlState.assigneeId || undefined),
      tag: urlState.tag || undefined,
      search: urlState.query || undefined,
    });
    return sortProjectTickets(filtered, urlState.sort);
  }, [currentTickets, urlState]);

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) {
      return null;
    }

    const fromBoard = currentTickets.find((ticket) => ticket.id === selectedTicketId);
    if (fromBoard) {
      return fromBoard;
    }

    if (!liveTicketQuery.data || liveTicketQuery.data.project_id !== project.id) {
      return null;
    }

    return liveTicketQuery.data;
  }, [currentTickets, liveTicketQuery.data, project.id, selectedTicketId]);

  const totalTickets = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalTickets / urlState.pageSize));
  const currentPage = Math.min(urlState.page, totalPages);
  const start = (currentPage - 1) * urlState.pageSize;
  const pagedTickets = filteredTickets.slice(start, start + urlState.pageSize);
  const boardError = liveColumnsQuery.error ?? liveTicketsQuery.error ?? liveTagsQuery.error;
  const boardErrorMessage = boardError ? toErrorMessage(boardError) : null;
  const isBoardLoading =
    liveColumnsQuery.isPending || liveTicketsQuery.isPending || liveTagsQuery.isPending;
  const hasTicketProjectMismatch =
    Boolean(selectedTicketId) &&
    Boolean(liveTicketQuery.data) &&
    liveTicketQuery.data?.project_id !== project.id;
  const ticketErrorMessage =
    hasTicketProjectMismatch
      ? "Selected ticket does not belong to this project."
      : (liveTicketQuery.error ? toErrorMessage(liveTicketQuery.error) : null);
  const isTicketLoading =
    Boolean(selectedTicketId) && !selectedTicket && liveTicketQuery.isPending;

  function updateUrlState(
    patch: Partial<ProjectUrlState>,
    options?: { resetPage?: boolean },
  ): void {
    const resetPage = options?.resetPage ?? true;
    const nextState: ProjectUrlState = {
      query: patch.query ?? urlState.query,
      tag: patch.tag ?? urlState.tag,
      assigneeId: patch.assigneeId ?? urlState.assigneeId,
      statusColumnId: patch.statusColumnId ?? urlState.statusColumnId,
      ticketId: patch.ticketId ?? urlState.ticketId,
      sort: patch.sort ?? urlState.sort,
      page: resetPage ? 1 : (patch.page ?? urlState.page),
      pageSize: patch.pageSize ?? urlState.pageSize,
    };

    void navigate({
      to: ".",
      search: nextState as never,
    });
  }

  const statusOptions = currentColumns.map((column) => ({ id: column.id, name: column.name }));

  return (
    <ProjectPage
      projectName={project.name}
      projectPrefix={project.prefix}
      columns={currentColumns}
      tickets={pagedTickets}
      tags={currentTags}
      members={members}
      totalTickets={totalTickets}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={urlState.pageSize}
      query={urlState.query}
      tag={urlState.tag}
      assigneeId={urlState.assigneeId}
      statusColumnId={urlState.statusColumnId}
      sort={urlState.sort}
      selectedTicket={selectedTicket}
      isBoardLoading={isBoardLoading}
      boardErrorMessage={boardErrorMessage}
      isTicketLoading={isTicketLoading}
      ticketErrorMessage={ticketErrorMessage}
      statusOptions={statusOptions}
      onQueryChange={(query) => updateUrlState({ query })}
      onTagChange={(tag) => updateUrlState({ tag })}
      onAssigneeChange={(assigneeId) => updateUrlState({ assigneeId })}
      onStatusChange={(statusColumnId) => updateUrlState({ statusColumnId })}
      onSortChange={(sort) => updateUrlState({ sort })}
      onPageSizeChange={(pageSize) => updateUrlState({ pageSize })}
      onTicketSelect={(ticketId) => updateUrlState({ ticketId }, { resetPage: false })}
      onTicketClose={() => updateUrlState({ ticketId: "" }, { resetPage: false })}
      onPrevPage={() => {
        if (currentPage > 1) {
          updateUrlState({ page: currentPage - 1 }, { resetPage: false });
        }
      }}
      onNextPage={() => {
        if (currentPage < totalPages) {
          updateUrlState({ page: currentPage + 1 }, { resetPage: false });
        }
      }}
    />
  );
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authCallbackRoute,
  orgsRoute,
  orgRoute,
  projectRoute,
]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined!,
  },
  defaultPreload: "intent",
  defaultPendingMs: 150,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
