import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  // Redirect on auth handled by beforeLoad; no useEffect needed here
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  async function handleSendOtp(): Promise<void> {
    setError(null);
    setMessage(null);
    setSendingOtp(true);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setSendingOtp(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setOtpRequested(true);
    setMessage("Passcode sent. Enter the code from your email.");
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setVerifyingOtp(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });

    setVerifyingOtp(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setMessage("Signed in. Redirecting...");
    await navigate({ to: "/orgs" });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your email and passcode from the email.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleVerifyOtp}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              disabled={otpRequested}
            />
          </div>

          {otpRequested ? (
            <div className="space-y-2">
              <Label htmlFor="otp-code">Passcode</Label>
              <Input
                id="otp-code"
                type="text"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.trim())}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>
          ) : null}

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!otpRequested ? (
            <Button
              disabled={sendingOtp || email.trim().length === 0}
              type="button"
              className="w-full"
              onClick={() => void handleSendOtp()}
            >
              {sendingOtp ? "Sending..." : "Send passcode"}
            </Button>
          ) : (
            <>
              <Button
                disabled={verifyingOtp || otpCode.trim().length === 0}
                type="submit"
                className="w-full"
              >
                {verifyingOtp ? "Verifying..." : "Verify passcode"}
              </Button>
              <Button
                disabled={sendingOtp}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleSendOtp()}
              >
                {sendingOtp ? "Resending..." : "Resend passcode"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setOtpRequested(false);
                  setOtpCode("");
                  setError(null);
                  setMessage(null);
                }}
              >
                Use a different email
              </Button>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
