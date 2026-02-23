import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function AuthCallbackPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    let active = true;

    async function completeSignIn(): Promise<void> {
      const code = new URL(window.location.href).searchParams.get("code");
      if (!code) {
        setStatus("Missing login code. Request a new magic link.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus(`Sign-in failed: ${error.message}`);
        return;
      }

      if (!active) {
        return;
      }

      setStatus("Signed in. Redirecting...");
      await navigate({ to: "/" });
    }

    void completeSignIn();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Auth callback</CardTitle>
        <CardDescription>{status}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        If this page stalls, return to login and use OTP passcode sign-in.
      </CardContent>
    </Card>
  );
}
