import { Link } from "@tanstack/react-router";
import type { OrgWithRole } from "@teamteamteam/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
      <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>

      {emptyState ? (
        <Card>
          <CardHeader>
            <CardTitle>No organizations found</CardTitle>
            <CardDescription>
              Create an org from CLI (`ttteam org create`) or use an existing membership.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{org.name}</span>
                  <Badge variant="secondary">{org.membership_role}</Badge>
                </CardTitle>
                <CardDescription>{org.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link to="/orgs/$orgId" params={{ orgId: org.id }}>
                    Open org
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
