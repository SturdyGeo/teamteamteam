import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MemberWithUser } from "@teamteamteam/api-client";
import type { Project } from "@teamteamteam/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useInviteMemberMutation } from "@/features/orgs/hooks";
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

type InviteRole = "member" | "admin" | "limited";

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

export function OrgPage({ orgId, orgName, projects, members }: OrgPageProps): React.JSX.Element {
  const inviteMutation = useInviteMemberMutation(orgId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setInviteError(null);
    setInviteMessage(null);

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError("Email is required.");
      return;
    }

    try {
      await inviteMutation.mutateAsync({
        email,
        role: inviteRole,
      });
      setInviteMessage(`Invited ${email} as ${inviteRole}.`);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error) {
      setInviteError(toMessage(error));
    }
  }

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
              <Link
                key={project.id}
                to="/orgs/$orgId/projects/$projectId"
                params={{ orgId: project.org_id, projectId: project.id }}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full border-border bg-card text-card-foreground transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/40">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{project.name}</span>
                      <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted">
                        {project.prefix}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="font-mono text-muted-foreground">{project.id}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Invite members</h2>
        <Card className="border-border bg-card text-card-foreground">
          <CardContent className="pt-6">
            <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={(event) => void handleInvite(event)}>
              <div className="space-y-1">
                <Label className="sr-only" htmlFor="invite-email">Member email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="sr-only" htmlFor="invite-role">Role</Label>
                <Select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as InviteRole)}
                  className="min-w-28"
                  disabled={inviteMutation.isPending}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="limited">Limited (assigned only)</option>
                </Select>
              </div>
              <Button
                type="submit"
                className="h-10 rounded-md border border-primary bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite"}
              </Button>
            </form>
            {inviteMessage ? <p className="mt-2 text-sm text-muted-foreground">{inviteMessage}</p> : null}
            {inviteError ? <p className="mt-2 text-sm text-destructive">{inviteError}</p> : null}
          </CardContent>
        </Card>
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
