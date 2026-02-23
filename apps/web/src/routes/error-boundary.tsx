import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps): React.JSX.Element {
  return (
    <Card className="mx-auto max-w-2xl rounded-[1.75rem] border-border bg-card/95 text-card-foreground shadow-[0_24px_70px_-40px_hsl(var(--background))] backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground">Something went wrong</CardTitle>
        <CardDescription className="text-muted-foreground">
          The route failed to load. You can retry or navigate back to organizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs text-destructive">
          {toErrorMessage(error)}
        </pre>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          className="rounded-full border-border bg-transparent text-foreground hover:bg-accent"
          onClick={reset}
        >
          Retry
        </Button>
        <Button
          asChild
          className="rounded-full border border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/orgs">Go to orgs</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function NotFoundPage(): React.JSX.Element {
  return (
    <Card className="mx-auto max-w-xl rounded-[1.75rem] border-border bg-card/95 text-card-foreground shadow-[0_24px_70px_-40px_hsl(var(--background))] backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground">Page not found</CardTitle>
        <CardDescription className="text-muted-foreground">
          The route does not exist or is no longer accessible.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          asChild
          className="rounded-full border border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/orgs">Go to orgs</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
