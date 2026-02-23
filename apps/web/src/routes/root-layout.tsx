import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useOrgProjectsQuery, useOrgsQuery } from "@/features/orgs/hooks";
import { useAuth } from "@/lib/auth";
import {
  getStoredOrgId,
  getStoredProjectId,
  setStoredOrgId,
  setStoredProjectId,
} from "@/lib/context-storage";

interface RouteContext {
  orgId: string | null;
  projectId: string | null;
}

function parseRouteContext(pathname: string): RouteContext {
  const projectMatch = pathname.match(/^\/orgs\/([^/]+)\/projects\/([^/]+)/);
  if (projectMatch) {
    return {
      orgId: projectMatch[1],
      projectId: projectMatch[2],
    };
  }

  const orgMatch = pathname.match(/^\/orgs\/([^/]+)/);
  if (orgMatch) {
    return {
      orgId: orgMatch[1],
      projectId: null,
    };
  }

  return {
    orgId: null,
    projectId: null,
  };
}

export function RootLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeContext = parseRouteContext(pathname);
  const { session, status, signOut } = useAuth();
  const isAuthenticated = status === "authenticated";

  const [preferredOrgId, setPreferredOrgId] = useState<string | null>(() => getStoredOrgId());
  const [preferredProjectId, setPreferredProjectId] = useState<string | null>(() =>
    getStoredProjectId(),
  );

  useEffect(() => {
    if (!routeContext.orgId) {
      return;
    }

    setPreferredOrgId(routeContext.orgId);
    setStoredOrgId(routeContext.orgId);
  }, [routeContext.orgId]);

  useEffect(() => {
    if (!routeContext.projectId) {
      return;
    }

    setPreferredProjectId(routeContext.projectId);
    setStoredProjectId(routeContext.projectId);
  }, [routeContext.projectId]);

  const orgsQuery = useOrgsQuery(isAuthenticated);
  const orgs = orgsQuery.data ?? [];
  const candidateOrgId = routeContext.orgId ?? preferredOrgId;
  const activeOrgId = orgs.some((org) => org.id === candidateOrgId)
    ? candidateOrgId
    : orgs[0]?.id ?? null;

  useEffect(() => {
    if (!activeOrgId) {
      if (preferredOrgId && orgs.length === 0) {
        setPreferredOrgId(null);
        setStoredOrgId(null);
      }
      return;
    }

    if (activeOrgId === preferredOrgId) {
      return;
    }

    setPreferredOrgId(activeOrgId);
    setStoredOrgId(activeOrgId);
  }, [activeOrgId, orgs.length, preferredOrgId]);

  const projectsQuery = useOrgProjectsQuery(activeOrgId, isAuthenticated);
  const projects = projectsQuery.data ?? [];
  const candidateProjectId = routeContext.projectId ?? preferredProjectId;
  const activeProjectId = projects.some((project) => project.id === candidateProjectId)
    ? candidateProjectId
    : projects[0]?.id ?? null;

  useEffect(() => {
    if (!activeProjectId) {
      if (preferredProjectId && projects.length === 0) {
        setPreferredProjectId(null);
        setStoredProjectId(null);
      }
      return;
    }

    if (activeProjectId === preferredProjectId) {
      return;
    }

    setPreferredProjectId(activeProjectId);
    setStoredProjectId(activeProjectId);
  }, [activeProjectId, preferredProjectId, projects.length]);

  async function handleSignOut(): Promise<void> {
    await signOut();
    queryClient.clear();
    setPreferredOrgId(null);
    setPreferredProjectId(null);
    setStoredOrgId(null);
    setStoredProjectId(null);
    await navigate({ to: "/login" });
  }

  async function handleOrgChange(event: React.ChangeEvent<HTMLSelectElement>): Promise<void> {
    const nextOrgId = event.target.value || null;
    setPreferredOrgId(nextOrgId);
    setStoredOrgId(nextOrgId);
    setPreferredProjectId(null);
    setStoredProjectId(null);

    if (!nextOrgId) {
      await navigate({ to: "/orgs" });
      return;
    }

    await navigate({ to: "/orgs/$orgId", params: { orgId: nextOrgId } });
  }

  async function handleProjectChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ): Promise<void> {
    const nextProjectId = event.target.value || null;
    setPreferredProjectId(nextProjectId);
    setStoredProjectId(nextProjectId);

    if (!nextProjectId || !activeOrgId) {
      return;
    }

    await navigate({
      to: "/orgs/$orgId/projects/$projectId",
      params: {
        orgId: activeOrgId,
        projectId: nextProjectId,
      },
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            teamteamteam web
          </Link>

          {status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading session...</p>
          ) : null}

          {status === "unauthenticated" ? (
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          ) : null}

          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-xs text-muted-foreground">{session?.user.email}</p>

              <select
                value={activeOrgId ?? ""}
                onChange={(event) => void handleOrgChange(event)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                aria-label="Organization selector"
              >
                <option value="">Select org</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              <select
                value={activeProjectId ?? ""}
                onChange={(event) => void handleProjectChange(event)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                aria-label="Project selector"
                disabled={!activeOrgId || projects.length === 0}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.prefix} · {project.name}
                  </option>
                ))}
              </select>

              <Button asChild variant="ghost" size="sm">
                <Link to="/orgs">Orgs</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
