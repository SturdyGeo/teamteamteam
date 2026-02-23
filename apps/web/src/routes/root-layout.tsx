import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import bossLogo from "../../boss.png";
import { Button } from "@/components/ui/button";
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

export function RootLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeContext = parseRouteContext(pathname);
  const { session, status, signOut } = useAuth();
  const isAuthenticated = status === "authenticated";
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

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

  const userEmail = session?.user.email ?? "";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_8%,rgba(253,186,116,0.32),transparent_35%),radial-gradient(circle_at_85%_12%,rgba(45,212,191,0.3),transparent_40%),linear-gradient(180deg,#fffaf3_0%,#f4f8ff_55%,#eefbf9_100%)]">
      <header className="sticky top-3 z-30 px-4">
        <div
          ref={menuContainerRef}
          className="mx-auto flex max-w-6xl items-center gap-3 rounded-full border border-slate-800/20 bg-slate-950/90 px-3 py-2 text-slate-100 shadow-[0_28px_65px_-38px_rgba(15,23,42,1)] backdrop-blur"
        >
          <Link
            to="/"
            className="inline-flex items-center"
          >
            <img src={bossLogo} alt="Boss logo" className="h-9 w-9 object-cover" />
          </Link>

          {status === "loading" ? (
            <p className="text-xs text-slate-300">Loading session...</p>
          ) : null}

          {status === "unauthenticated" ? (
            <div className="ml-auto">
              <Button asChild size="sm" className="rounded-full">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          ) : null}

          {isAuthenticated ? (
            <>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu((current) => (current === "org" ? null : "org"))}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white transition hover:bg-white/15"
                  >
                    <span className="truncate max-w-40">{activeOrg?.name ?? "Select org"}</span>
                    <span>▾</span>
                  </button>

                  {openMenu === "org" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                      <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                        Organizations
                      </p>
                      <div className="max-h-56 overflow-auto">
                        {orgs.map((org) => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => void selectOrg(org.id)}
                            className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            {org.name}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          setCreateOrgError(null);
                          setShowCreateOrgDialog(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        + Add organization
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    disabled={!activeOrgId}
                    onClick={() =>
                      setOpenMenu((current) => (current === "project" ? null : "project"))
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white transition hover:bg-white/15 disabled:opacity-45"
                  >
                    <span className="truncate max-w-44">
                      {activeProject ? `${activeProject.prefix} · ${activeProject.name}` : "Select project"}
                    </span>
                    <span>▾</span>
                  </button>

                  {openMenu === "project" ? (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                      <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                        Projects
                      </p>
                      <div className="max-h-56 overflow-auto">
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => void selectProject(project.id)}
                            className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            {project.prefix} · {project.name}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          setCreateProjectError(null);
                          setShowCreateProjectDialog(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        + Add project
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu((current) => (current === "profile" ? null : "profile"))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-cyan-500 text-xs font-semibold text-slate-900"
                >
                  {profileInitials(userEmail)}
                </button>

                {openMenu === "profile" ? (
                  <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                    <p className="truncate px-2 py-1 text-xs text-slate-500">{userEmail}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        void navigate({ to: "/orgs" });
                      }}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      Organizations
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5">
        <Outlet />
      </main>

      {showCreateOrgDialog ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => void handleCreateOrg(event)}
            className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">Create organization</h2>
            <p className="mt-1 text-sm text-slate-500">Add a new organization workspace.</p>

            <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="new-org-name">
              Name
            </label>
            <input
              id="new-org-name"
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500"
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
              placeholder="Acme Engineering"
            />

            {createOrgError ? <p className="mt-2 text-sm text-rose-600">{createOrgError}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setShowCreateOrgDialog(false);
                  setCreateOrgError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full" disabled={createOrgMutation.isPending}>
                {createOrgMutation.isPending ? "Creating..." : "Create org"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {showCreateProjectDialog ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => void handleCreateProject(event)}
            className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">Create project</h2>
            <p className="mt-1 text-sm text-slate-500">Projects are created under the selected org.</p>

            <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="new-project-name">
              Name
            </label>
            <input
              id="new-project-name"
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Mobile App"
            />

            <label className="mt-3 block text-sm font-medium text-slate-700" htmlFor="new-project-prefix">
              Prefix
            </label>
            <input
              id="new-project-prefix"
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase outline-none focus:border-teal-500"
              value={newProjectPrefix}
              onChange={(event) => setNewProjectPrefix(event.target.value.toUpperCase())}
              placeholder="MOB"
              maxLength={10}
            />

            {createProjectError ? (
              <p className="mt-2 text-sm text-rose-600">{createProjectError}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setShowCreateProjectDialog(false);
                  setCreateProjectError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full"
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
