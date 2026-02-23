import { Link } from "@tanstack/react-router";
import type { MemberWithUser } from "@teamteamteam/api-client";
import type { Project } from "@teamteamteam/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OrgPageProps {
  orgId: string;
  orgName: string;
  projects: Project[];
  members: MemberWithUser[];
}

export function OrgPage({ orgId, orgName, projects, members }: OrgPageProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{orgName}</h1>
        <p className="font-mono text-sm text-zinc-500">{orgId}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Projects</h2>
        {projects.length === 0 ? (
          <Card className="border-zinc-700 bg-zinc-900/95 text-zinc-100">
            <CardHeader>
              <CardTitle>No projects</CardTitle>
              <CardDescription className="text-zinc-400">
                Create one from CLI (`ttteam project create`) to start using the web board.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="border-zinc-700 bg-zinc-900/95 text-zinc-100">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{project.name}</span>
                    <Badge className="border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-800">
                      {project.prefix}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="font-mono text-zinc-500">{project.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-md border border-emerald-700 bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800/80"
                  >
                    <Link
                      to="/orgs/$orgId/projects/$projectId"
                      params={{ orgId: project.org_id, projectId: project.id }}
                    >
                      Open board
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Members</h2>
        <Card className="border-zinc-700 bg-zinc-900/95 text-zinc-100">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {members.length === 0 ? (
                <p className="text-sm text-zinc-500">No visible members.</p>
              ) : (
                members.map((member) => (
                  <Badge
                    key={member.id}
                    className="border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-800"
                  >
                    {member.user.email} ({member.role})
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
