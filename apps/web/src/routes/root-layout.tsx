import { useEffect, useRef, useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import bossLogo from "../../boss.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateOrgMutation,
  useCreateProjectMutation,
  useOrgProjectsQuery,
  useOrgsQuery,
} from "@/features/orgs/hooks";
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toScopedId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return UUID_REGEX.test(value) ? value : null;
}

function parseRouteContext(pathname: string): RouteContext {
  const projectMatch = pathname.match(/^\/orgs\/([^/]+)\/projects\/([^/]+)/);
  if (projectMatch) {
    return {
      orgId: toScopedId(projectMatch[1]),
      projectId: toScopedId(projectMatch[2]),
    };
  }

  const orgMatch = pathname.match(/^\/orgs\/([^/]+)/);
  if (orgMatch) {
    return {
      orgId: toScopedId(orgMatch[1]),
      projectId: null,
    };
  }

  return {
    orgId: null,
    projectId: null,
  };
}

function profileInitials(email: string | undefined): string {
  if (!email) {
    return "U";
  }

  const [name] = email.split("@");
  return name.slice(0, 2).toUpperCase();
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

type OpenMenu = "org" | "project" | "profile" | null;
const PRIMARY_BUTTON_CLASS =
  "border border-primary bg-primary text-primary-foreground hover:bg-primary/90";

export function RootLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routerStatus = useRouterState({ select: (state) => state.status });
  const routeContext = parseRouteContext(pathname);
  const { session, status, signOut } = useAuth();
  const isAuthenticated = status === "authenticated";
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const splashDismissedRef = useRef(false);

  const [preferredOrgId, setPreferredOrgId] = useState<string | null>(() => getStoredOrgId());
  const [preferredProjectId, setPreferredProjectId] = useState<string | null>(() =>
    getStoredProjectId(),
  );

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPrefix, setNewProjectPrefix] = useState("");
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);

  useEffect(() => {
    function onPointerDown(event: MouseEvent): void {
      if (!menuContainerRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !menuContainerRef.current.contains(target)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (splashDismissedRef.current) {
      return;
    }

    // Keep the boot splash visible until auth hydration and the initial route load settle.
    if (status === "loading" || routerStatus === "pending") {
      return;
    }

    const splash = document.getElementById("boot-splash");
    if (!splash) {
      splashDismissedRef.current = true;
      return;
    }

    splashDismissedRef.current = true;
    splash.style.opacity = "0";
    window.setTimeout(() => {
      splash.remove();
    }, 180);
  }, [routerStatus, status]);

  useEffect(() => {
    if (!routeContext.orgId) {
      return;
    }

    setPreferredOrgId(routeContext.orgId);
    setStoredOrgId(routeContext.orgId);
  }, [routeContext.orgId]);

  useEffect(() => {
    const malformedOrgScopedPath = pathname.startsWith("/orgs/") && !routeContext.orgId;
    if (!malformedOrgScopedPath) {
      return;
    }

    void navigate({ to: "/orgs", replace: true });
  }, [navigate, pathname, routeContext.orgId]);

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

  const createOrgMutation = useCreateOrgMutation();
  const createProjectMutation = useCreateProjectMutation(activeOrgId);

  const activeOrg = orgs.find((org) => org.id === activeOrgId) ?? null;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  async function handleSignOut(): Promise<void> {
    await signOut();
    queryClient.clear();
    setPreferredOrgId(null);
    setPreferredProjectId(null);
    setStoredOrgId(null);
    setStoredProjectId(null);
    await navigate({ to: "/login" });
  }

  async function selectOrg(orgId: string): Promise<void> {
    setPreferredOrgId(orgId);
    setStoredOrgId(orgId);
    setPreferredProjectId(null);
    setStoredProjectId(null);
    setOpenMenu(null);
    await navigate({ to: "/orgs/$orgId", params: { orgId } });
  }

  async function selectProject(projectId: string): Promise<void> {
    if (!activeOrgId) {
      return;
    }

    setPreferredProjectId(projectId);
    setStoredProjectId(projectId);
    setOpenMenu(null);
    await navigate({
      to: "/orgs/$orgId/projects/$projectId",
      params: {
        orgId: activeOrgId,
        projectId,
      },
    });
  }

  async function handleCreateOrg(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateOrgError(null);
    const name = newOrgName.trim();
    if (!name) {
      setCreateOrgError("Organization name is required.");
      return;
    }

    try {
      const org = await createOrgMutation.mutateAsync({ name });
      setShowCreateOrgDialog(false);
      setNewOrgName("");
      setPreferredOrgId(org.id);
      setStoredOrgId(org.id);
      setPreferredProjectId(null);
      setStoredProjectId(null);
      await navigate({ to: "/orgs/$orgId", params: { orgId: org.id } });
    } catch (error) {
      setCreateOrgError(toMessage(error));
    }
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateProjectError(null);
    if (!activeOrgId) {
      setCreateProjectError("Select an organization first.");
      return;
    }

    const name = newProjectName.trim();
    const prefix = newProjectPrefix.trim().toUpperCase();

    if (!name || !prefix) {
      setCreateProjectError("Project name and prefix are required.");
      return;
    }

    try {
      const project = await createProjectMutation.mutateAsync({ name, prefix });
      setShowCreateProjectDialog(false);
      setNewProjectName("");
      setNewProjectPrefix("");
      setPreferredProjectId(project.id);
      setStoredProjectId(project.id);
      await navigate({
        to: "/orgs/$orgId/projects/$projectId",
        params: {
          orgId: activeOrgId,
          projectId: project.id,
        },
      });
    } catch (error) {
      setCreateProjectError(toMessage(error));
    }
  }

  function closeCreateOrgDialog(): void {
    setShowCreateOrgDialog(false);
    setCreateOrgError(null);
  }

  function closeCreateProjectDialog(): void {
    setShowCreateProjectDialog(false);
    setCreateProjectError(null);
  }

  useHotkey(
    "Escape",
    () => {
      if (showCreateProjectDialog) {
        closeCreateProjectDialog();
        return;
      }

      if (showCreateOrgDialog) {
        closeCreateOrgDialog();
      }
    },
    { enabled: showCreateOrgDialog || showCreateProjectDialog },
  );

  function handleLogoClick(): void {
    if (!isAuthenticated) {
      return;
    }

    setIsLogoSpinning(false);
    window.requestAnimationFrame(() => {
      setIsLogoSpinning(true);
    });
  }

  const userEmail = session?.user.email ?? "";
  const isAuthSurfaceRoute =
    status !== "authenticated" &&
    (pathname === "/" || pathname === "/login" || pathname === "/auth/callback");

  if (isAuthSurfaceRoute) {
    return (
      <div className="min-h-screen bg-app-auth-surface">
        <main className="grid min-h-screen place-items-center px-4 py-10">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-shell">
      <header className="sticky top-2 z-30 flex justify-center px-3 pt-1">
        <div
          ref={menuContainerRef}
          className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--card)/0.86)_100%)] px-2.5 py-1.5 text-foreground shadow-[0_24px_52px_-42px_hsl(var(--primary)/0.75)] backdrop-blur"
        >
          <Link
            to="/"
            className="inline-flex items-center"
            onClick={handleLogoClick}
          >
            <img
              src={bossLogo}
              alt="Boss logo"
              draggable={false}
              className={`h-7 w-7 object-cover ${isLogoSpinning ? "animate-boss-logo-jump-spin" : ""}`}
              onAnimationEnd={() => setIsLogoSpinning(false)}
            />
          </Link>

          {status === "loading" ? (
            <p className="text-xs text-muted-foreground">Loading session...</p>
          ) : null}

          {status === "unauthenticated" ? (
            <div className="ml-auto">
              <Button
                asChild
                size="sm"
                className={`rounded-full font-mono ${PRIMARY_BUTTON_CLASS}`}
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          ) : null}

          {isAuthenticated ? (
            <>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenMenu((current) => (current === "org" ? null : "org"))}
                    className="inline-flex h-auto items-center gap-1 border-0 bg-transparent px-1 py-0 font-mono text-xs text-foreground transition hover:bg-transparent hover:text-foreground"
                  >
                    <span className="truncate max-w-40">{activeOrg?.name ?? "Select org"}</span>
                    <span>▾</span>
                  </Button>

                  {openMenu === "org" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 font-mono text-foreground shadow-xl">
                      <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Organizations
                      </p>
                      <div className="max-h-56 overflow-auto">
                        {orgs.map((org) => (
                          <Button
                            key={org.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void selectOrg(org.id)}
                            className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            {org.name}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOpenMenu(null);
                          setCreateOrgError(null);
                          setShowCreateOrgDialog(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-dashed border-border px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-accent"
                      >
                        + Add organization
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!activeOrgId}
                    onClick={() =>
                      setOpenMenu((current) => (current === "project" ? null : "project"))
                    }
                    className="inline-flex h-auto items-center gap-1 border-0 bg-transparent px-1 py-0 font-mono text-xs text-foreground transition hover:bg-transparent hover:text-foreground disabled:opacity-45"
                  >
                    <span className="truncate max-w-44">
                      {activeProject ? activeProject.name : "Select project"}
                    </span>
                    <span>▾</span>
                  </Button>

                  {openMenu === "project" ? (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-card p-2 font-mono text-foreground shadow-xl">
                      <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Projects
                      </p>
                      <div className="max-h-56 overflow-auto">
                        {projects.map((project) => (
                          <Button
                            key={project.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void selectProject(project.id)}
                            className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            {project.name}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOpenMenu(null);
                          setCreateProjectError(null);
                          setShowCreateProjectDialog(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-dashed border-border px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-accent"
                      >
                        + Add project
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpenMenu((current) => (current === "profile" ? null : "profile"))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground hover:bg-accent"
                >
                  {profileInitials(userEmail)}
                </Button>

                {openMenu === "profile" ? (
                  <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-border bg-card p-2 font-mono text-foreground shadow-xl">
                    <p className="truncate px-2 py-1 text-xs text-muted-foreground">{userEmail}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpenMenu(null);
                        void navigate({ to: "/orgs" });
                      }}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      Organizations
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleSignOut()}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      Sign out
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5 font-mono text-foreground">
        <Outlet />
      </main>

      {showCreateOrgDialog ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => void handleCreateOrg(event)}
            className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-5 font-mono text-foreground shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-foreground">Create organization</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add a new organization workspace.</p>

            <Label className="mt-4 block text-sm font-medium text-foreground" htmlFor="new-org-name">
              Name
            </Label>
            <Input
              id="new-org-name"
              className="mt-1 h-10 w-full rounded-xl border-border bg-background text-sm text-foreground"
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
              placeholder="Acme Engineering"
            />

            {createOrgError ? <p className="mt-2 text-sm text-destructive">{createOrgError}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-border bg-transparent text-foreground hover:bg-accent"
                onClick={closeCreateOrgDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={`rounded-full ${PRIMARY_BUTTON_CLASS}`}
                disabled={createOrgMutation.isPending}
              >
                {createOrgMutation.isPending ? "Creating..." : "Create org"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {showCreateProjectDialog ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => void handleCreateProject(event)}
            className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-5 font-mono text-foreground shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-foreground">Create project</h2>
            <p className="mt-1 text-sm text-muted-foreground">Projects are created under the selected org.</p>

            <Label className="mt-4 block text-sm font-medium text-foreground" htmlFor="new-project-name">
              Name
            </Label>
            <Input
              id="new-project-name"
              className="mt-1 h-10 w-full rounded-xl border-border bg-background text-sm text-foreground"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Mobile App"
            />

            <Label className="mt-3 block text-sm font-medium text-foreground" htmlFor="new-project-prefix">
              Prefix
            </Label>
            <Input
              id="new-project-prefix"
              className="mt-1 h-10 w-full rounded-xl border-border bg-background text-sm uppercase text-foreground"
              value={newProjectPrefix}
              onChange={(event) => setNewProjectPrefix(event.target.value.toUpperCase())}
              placeholder="MOB"
              maxLength={10}
            />

            {createProjectError ? (
              <p className="mt-2 text-sm text-destructive">{createProjectError}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-border bg-transparent text-foreground hover:bg-accent"
                onClick={closeCreateProjectDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={`rounded-full ${PRIMARY_BUTTON_CLASS}`}
                disabled={createProjectMutation.isPending || !activeOrgId}
              >
                {createProjectMutation.isPending ? "Creating..." : "Create project"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
