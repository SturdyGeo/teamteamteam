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
    <Card className="mx-auto max-w-2xl rounded-[1.75rem] border-zinc-700 bg-zinc-900/95 text-zinc-100 shadow-[0_24px_70px_-40px_rgba(0,0,0,1)] backdrop-blur">
      <CardHeader>
        <CardTitle className="text-zinc-100">Something went wrong</CardTitle>
        <CardDescription className="text-zinc-400">
          The route failed to load. You can retry or navigate back to organizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-rose-200">
          {toErrorMessage(error)}
        </pre>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          className="rounded-full border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800"
          onClick={reset}
        >
          Retry
        </Button>
        <Button
          asChild
          className="rounded-full border border-emerald-700 bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800/80"
        >
          <Link to="/orgs">Go to orgs</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function NotFoundPage(): React.JSX.Element {
  return (
    <Card className="mx-auto max-w-xl rounded-[1.75rem] border-zinc-700 bg-zinc-900/95 text-zinc-100 shadow-[0_24px_70px_-40px_rgba(0,0,0,1)] backdrop-blur">
      <CardHeader>
        <CardTitle className="text-zinc-100">Page not found</CardTitle>
        <CardDescription className="text-zinc-400">
          The route does not exist or is no longer accessible.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          asChild
          className="rounded-full border border-emerald-700 bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800/80"
        >
          <Link to="/orgs">Go to orgs</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
