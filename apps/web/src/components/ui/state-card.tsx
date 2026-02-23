import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface StateCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "default" | "destructive";
}

export function StateCard({
  title,
  description,
  action,
  className,
  tone = "default",
}: StateCardProps): React.JSX.Element {
  return (
    <Card className={cn(tone === "destructive" ? "border-destructive/50" : "", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? <CardFooter>{action}</CardFooter> : <CardContent className="h-1" />}
    </Card>
  );
}
