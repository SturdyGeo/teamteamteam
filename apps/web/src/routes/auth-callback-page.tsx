import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
    <div className="w-full max-w-[560px] rounded-lg border border-border bg-card p-8 text-card-foreground shadow-[0_24px_90px_-50px_hsl(var(--background))] md:p-10">
      <h1 className="font-mono text-xl font-semibold text-foreground">Auth callback</h1>
      <p className="mt-2 font-mono text-sm text-foreground">{status}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        If this page stalls, return to login and use OTP passcode sign-in.
      </p>
    </div>
  );
}
