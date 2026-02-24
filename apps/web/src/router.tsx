import { useMemo, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { sortColumns, sortTickets, type Project, type Ticket, type WorkflowColumn } from "@teamteamteam/domain";
import { Button } from "@/components/ui/button";
import { useOrgMembersQuery, useOrgProjectsQuery } from "@/features/orgs/hooks";
import { orgMembersQueryOptions, orgProjectsQueryOptions, orgsQueryOptions } from "@/features/orgs/queries";
import {
  useCreateTicketMutation,
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
import { useVisibleProjectBoards } from "@/routes/root-layout";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
    throw redirect({ to: "/" });
  }
}

async function redirectToDefaultProject(
  queryClient: QueryClient,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return;
  }

  const orgs = await queryClient.ensureQueryData(orgsQueryOptions());
  const firstOrg = orgs[0];

  if (!firstOrg) {
    throw redirect({ to: "/orgs" });
  }

  const projects = await queryClient.ensureQueryData(orgProjectsQueryOptions(firstOrg.id));
  const firstProject = projects[0];

  if (!firstProject) {
    throw redirect({
      to: "/orgs/$orgId",
      params: { orgId: firstOrg.id },
    });
  }

  throw redirect({
    to: "/orgs/$orgId/projects/$projectId",
    params: {
      orgId: firstOrg.id,
      projectId: firstProject.id,
    },
  });
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: async ({ context }) => {
    await redirectToDefaultProject(context.queryClient);
    return null;
  },
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
      viewerRole={org.membership_role}
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
      projects,
      columns,
      tickets,
      members,
    };
  },
  component: ProjectRouteComponent,
  errorComponent: RouteErrorBoundary,
});

interface ProjectBoardSectionProps {
  project: Project;
  members: ReturnType<typeof projectRoute.useLoaderData>["members"];
  seedColumns?: WorkflowColumn[];
  seedTickets?: Ticket[];
}

function ProjectBoardSection({
  project,
  members,
  seedColumns,
  seedTickets,
}: ProjectBoardSectionProps): React.JSX.Element {
  const liveColumnsQuery = useProjectColumnsQuery(project.id);
  const liveTicketsQuery = useProjectTicketsQuery(project.id);
  const createTicketMutation = useCreateTicketMutation(project.id);
  const moveTicketMutation = useMoveTicketMutation(project.id);

  const currentColumns = useMemo(
    () => sortColumns(liveColumnsQuery.data ?? seedColumns ?? []),
    [liveColumnsQuery.data, seedColumns],
  );
  const currentTickets = useMemo(
    () => sortTickets(liveTicketsQuery.data ?? seedTickets ?? []),
    [liveTicketsQuery.data, seedTickets],
  );
  const boardError = liveColumnsQuery.error ?? liveTicketsQuery.error;
  const boardErrorMessage = boardError ? toErrorMessage(boardError) : null;
  const isBoardLoading =
    (liveColumnsQuery.isPending && !seedColumns) ||
    (liveTicketsQuery.isPending && !seedTickets);

  async function handleTicketMove(ticketId: string, toColumnId: string): Promise<void> {
    await moveTicketMutation.mutateAsync({ ticketId, toColumnId });
  }

  async function handleTicketCreate(
    toColumnId: string,
    title: string,
    description: string,
    tags: string[],
  ): Promise<void> {
    const created = await createTicketMutation.mutateAsync({
      title,
      description,
      tags,
    });

    if (created.status_column_id !== toColumnId) {
      await moveTicketMutation.mutateAsync({
        ticketId: created.id,
        toColumnId,
      });
    }

    await liveTicketsQuery.refetch();
  }

  return (
    <ProjectPage
      projectId={project.id}
      projectName={project.name}
      projectPrefix={project.prefix}
      columns={currentColumns}
      tickets={currentTickets}
      members={members}
      isBoardLoading={isBoardLoading}
      boardErrorMessage={boardErrorMessage}
      isMovePending={moveTicketMutation.isPending}
      isCreatePending={createTicketMutation.isPending}
      onTicketMove={handleTicketMove}
      onTicketCreate={handleTicketCreate}
    />
  );
}

function ProjectRouteComponent(): React.JSX.Element {
  const { project, projects, columns, tickets, members } = projectRoute.useLoaderData();
  const { visibleProjectIds, setVisibleProjectIds } = useVisibleProjectBoards();
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<string | null>(null);

  const projectsById = useMemo(
    () => new Map(projects.map((item) => [item.id, item])),
    [projects],
  );
  const orderedProjectIds = useMemo(() => {
    const chosen = visibleProjectIds.filter((projectId) => projectsById.has(projectId));
    return [project.id, ...chosen.filter((projectId) => projectId !== project.id)];
  }, [project.id, projectsById, visibleProjectIds]);
  const secondaryProjects = orderedProjectIds
    .filter((projectId) => projectId !== project.id)
    .map((projectId) => projectsById.get(projectId))
    .filter((item): item is Project => Boolean(item));

  function reorderSecondaryProjects(draggedProjectId: string, targetProjectId: string): void {
    if (draggedProjectId === targetProjectId) {
      return;
    }

    setVisibleProjectIds((current) => {
      const currentSecondary = current.filter(
        (projectId) => projectId !== project.id && projectsById.has(projectId),
      );
      const fromIndex = currentSecondary.indexOf(draggedProjectId);
      const toIndex = currentSecondary.indexOf(targetProjectId);
      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const reordered = [...currentSecondary];
      reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, draggedProjectId);
      return [project.id, ...reordered];
    });
  }

  return (
    <div className="space-y-5">
      <ProjectBoardSection
        project={project}
        members={members}
        seedColumns={columns}
        seedTickets={tickets}
      />

      {secondaryProjects.map((secondaryProject) => (
        <section key={secondaryProject.id} className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            draggable
            aria-label={`Reorder ${secondaryProject.name}`}
            onDragStart={(event) => {
              setDraggingProjectId(secondaryProject.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", secondaryProject.id);
            }}
            onDragEnd={() => {
              setDraggingProjectId(null);
              setDropTargetProjectId(null);
            }}
            className="mt-12 h-8 w-8 cursor-grab rounded-full border border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
          >
            ≡
          </Button>

          <div
            className={cn(
              "flex-1 rounded-[1.8rem] transition",
              dropTargetProjectId === secondaryProject.id ? "ring-2 ring-primary/70 ring-offset-2 ring-offset-background" : "",
            )}
            onDragOver={(event) => {
              if (!draggingProjectId) {
                return;
              }

              event.preventDefault();
              if (dropTargetProjectId !== secondaryProject.id) {
                setDropTargetProjectId(secondaryProject.id);
              }
            }}
            onDragLeave={() => {
              if (dropTargetProjectId === secondaryProject.id) {
                setDropTargetProjectId(null);
              }
            }}
            onDrop={(event) => {
              if (!draggingProjectId) {
                return;
              }

              event.preventDefault();
              reorderSecondaryProjects(draggingProjectId, secondaryProject.id);
              setDraggingProjectId(null);
              setDropTargetProjectId(null);
            }}
          >
            <ProjectBoardSection
              project={secondaryProject}
              members={members}
            />
          </div>
        </section>
      ))}
    </div>
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
