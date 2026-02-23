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
        <h1 className="text-2xl font-semibold tracking-tight">{orgName}</h1>
        <p className="text-sm text-muted-foreground">{orgId}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Projects</h2>
        {projects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No projects</CardTitle>
              <CardDescription>
                Create one from CLI (`ttteam project create`) to start using the web board.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{project.name}</span>
                    <Badge variant="outline">{project.prefix}</Badge>
                  </CardTitle>
                  <CardDescription>{project.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm">
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
        <h2 className="text-xl font-semibold">Members</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visible members.</p>
              ) : (
                members.map((member) => (
                  <Badge key={member.id} variant="secondary">
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
