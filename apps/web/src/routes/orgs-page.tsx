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
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Organizations</h1>

      {emptyState ? (
        <Card className="border-zinc-700 bg-zinc-900/95 text-zinc-100">
          <CardHeader>
            <CardTitle>No organizations found</CardTitle>
            <CardDescription className="text-zinc-400">
              Create an org from CLI (`ttteam org create`) or use an existing membership.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org) => (
            <Card key={org.id} className="border-zinc-700 bg-zinc-900/95 text-zinc-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{org.name}</span>
                  <Badge className="border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-800">
                    {org.membership_role}
                  </Badge>
                </CardTitle>
                <CardDescription className="font-mono text-zinc-500">{org.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  size="sm"
                  className="rounded-md border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
                >
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
