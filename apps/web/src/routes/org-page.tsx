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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{orgName}</h1>
        <p className="font-mono text-sm text-muted-foreground">{orgId}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Projects</h2>
        {projects.length === 0 ? (
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>No projects</CardTitle>
              <CardDescription className="text-muted-foreground">
                Create one from CLI (`ttteam project create`) to start using the web board.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="border-border bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{project.name}</span>
                    <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted">
                      {project.prefix}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="font-mono text-muted-foreground">{project.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-md border border-primary bg-primary text-primary-foreground hover:bg-primary/90"
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
        <h2 className="text-xl font-semibold text-foreground">Members</h2>
        <Card className="border-border bg-card text-card-foreground">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visible members.</p>
              ) : (
                members.map((member) => (
                  <Badge
                    key={member.id}
                    className="border-border bg-muted text-muted-foreground hover:bg-muted"
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
