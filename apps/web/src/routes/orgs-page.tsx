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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrgsPageProps {
  orgs: OrgWithRole[];
  totalOrgs: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  query: string;
  sort: "name_asc" | "name_desc";
  onQueryChange: (value: string) => void;
  onSortChange: (value: "name_asc" | "name_desc") => void;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function OrgsPage({
  orgs,
  totalOrgs,
  totalPages,
  currentPage,
  pageSize,
  query,
  sort,
  onQueryChange,
  onSortChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
}: OrgsPageProps): React.JSX.Element {
  const emptyState = totalOrgs === 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">View controls</CardTitle>
          <CardDescription>
            URL-backed query, sorting, and pagination for org navigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="org-query">Search</Label>
            <Input
              id="org-query"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Filter orgs by name"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-sort">Sort</Label>
            <select
              id="org-sort"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as "name_asc" | "name_desc")}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-page-size">Page size</Label>
            <select
              id="org-page-size"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {emptyState ? (
        <Card>
          <CardHeader>
            <CardTitle>No organizations found</CardTitle>
            <CardDescription>
              {query
                ? "Try a broader search or clear the query."
                : "Create an org from CLI (`ttteam org create`) or use an existing membership."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
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

          <div className="flex items-center justify-between rounded-md border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              {totalOrgs} total · page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={onPrevPage}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={onNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
