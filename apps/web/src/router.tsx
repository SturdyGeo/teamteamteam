import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { sortColumns, sortTickets } from "@teamteamteam/domain";
import { useOrgMembersQuery, useOrgProjectsQuery } from "@/features/orgs/hooks";
import { orgMembersQueryOptions, orgProjectsQueryOptions, orgsQueryOptions } from "@/features/orgs/queries";
import {
  useProjectColumnsQuery,
  useMoveTicketMutation,
  useProjectTicketsQuery,
} from "@/features/projects/hooks";
import {
  projectColumnsQueryOptions,
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
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
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
  const { orgs } = orgsRoute.useLoaderData();

  return (
    <OrgsPage orgs={orgs} />
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

    const [projects, columns, tickets, members] = await Promise.all([
      context.queryClient.ensureQueryData(orgProjectsQueryOptions(params.orgId)),
      context.queryClient.ensureQueryData(projectColumnsQueryOptions(params.projectId)),
      context.queryClient.ensureQueryData(projectTicketsQueryOptions(params.projectId)),
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
      members,
    };
  },
  component: ProjectRouteComponent,
  errorComponent: RouteErrorBoundary,
});

function ProjectRouteComponent(): React.JSX.Element {
  const { project, columns, tickets, members } = projectRoute.useLoaderData();
  const liveColumnsQuery = useProjectColumnsQuery(project.id);
  const liveTicketsQuery = useProjectTicketsQuery(project.id);
  const moveTicketMutation = useMoveTicketMutation(project.id);

  const currentColumns = sortColumns(liveColumnsQuery.data ?? columns);
  const currentTickets = sortTickets(liveTicketsQuery.data ?? tickets);
  const boardError = liveColumnsQuery.error ?? liveTicketsQuery.error;
  const boardErrorMessage = boardError ? toErrorMessage(boardError) : null;
  const isBoardLoading = liveColumnsQuery.isPending || liveTicketsQuery.isPending;

  async function handleTicketMove(ticketId: string, toColumnId: string): Promise<void> {
    await moveTicketMutation.mutateAsync({ ticketId, toColumnId });
    await liveTicketsQuery.refetch();
  }

  return (
    <ProjectPage
      projectName={project.name}
      projectPrefix={project.prefix}
      columns={currentColumns}
      tickets={currentTickets}
      members={members}
      isBoardLoading={isBoardLoading}
      boardErrorMessage={boardErrorMessage}
      isMovePending={moveTicketMutation.isPending}
      onTicketMove={handleTicketMove}
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
