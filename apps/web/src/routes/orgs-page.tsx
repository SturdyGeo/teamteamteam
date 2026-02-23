import { Link } from "@tanstack/react-router";
import type { OrgWithRole } from "@teamteamteam/api-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OrgsPageProps {
  orgs: OrgWithRole[];
}

export function OrgsPage({ orgs }: OrgsPageProps): React.JSX.Element {
  const emptyState = orgs.length === 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Organizations</h1>

      {emptyState ? (
        <Card className="border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>No organizations found</CardTitle>
            <CardDescription className="text-muted-foreground">
              Create an org from CLI (`ttteam org create`) or use an existing membership.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org) => (
            <Link
              key={org.id}
              to="/orgs/$orgId"
              params={{ orgId: org.id }}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full border-border bg-card text-card-foreground transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{org.name}</span>
                    <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted">
                      {org.membership_role}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="font-mono text-muted-foreground">{org.id}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
