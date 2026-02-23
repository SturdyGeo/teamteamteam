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
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          The route failed to load. You can retry or navigate back to organizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          {toErrorMessage(error)}
        </pre>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={reset}>
          Retry
        </Button>
        <Button asChild>
          <Link to="/orgs">Go to orgs</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function NotFoundPage(): React.JSX.Element {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Page not found</CardTitle>
        <CardDescription>
          The route does not exist or is no longer accessible.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild>
          <Link to="/orgs">Go to orgs</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
