import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import bossLogo from "../../boss.png";
import { Button } from "@/components/ui/button";
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
    await navigate({ to: "/" });
  }

  return (
    <div className="w-full max-w-[560px] rounded-lg border border-zinc-800 bg-zinc-900/95 p-8 text-zinc-200 shadow-[0_24px_90px_-50px_rgba(0,0,0,1)] md:p-10">
      <div className="mb-6 text-center">
        <img
          src={bossLogo}
          alt="Teamteamteam logo"
          className="mx-auto mb-4 h-24 w-24 rounded-lg object-contain"
        />
        <h1 className="text-[22px] font-semibold text-white">Teamteamteam</h1>
        <p className="mt-1 text-sm text-zinc-400">Terminal-first Kanban</p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-6 font-mono">
        {!otpRequested ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Login requested for:</p>
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              className="h-11 rounded-md border-zinc-700 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-500"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">Login requested for:</p>
            <p className="break-all text-base font-semibold text-white">{email}</p>

            <p className="text-sm text-zinc-300">Your one-time login code:</p>
            <div className="rounded-md border border-zinc-700 bg-zinc-950 p-4 text-center">
              <Label htmlFor="otp-code" className="sr-only">
                One-time passcode
              </Label>
              <Input
                id="otp-code"
                type="text"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.trim())}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                className="h-auto border-none bg-transparent px-0 text-center text-3xl font-semibold tracking-[0.45em] text-white shadow-none outline-none placeholder:text-zinc-500 focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-zinc-500">
              This code expires shortly and can only be used once.
            </p>
          </div>
        )}

        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="space-y-2">
          {!otpRequested ? (
            <Button
              disabled={sendingOtp || email.trim().length === 0}
              type="button"
              className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
              onClick={() => void handleSendOtp()}
            >
              {sendingOtp ? "Sending..." : "Send passcode"}
            </Button>
          ) : (
            <>
              <Button
                disabled={verifyingOtp || otpCode.trim().length === 0}
                type="submit"
                className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
              >
                {verifyingOtp ? "Verifying..." : "Verify passcode"}
              </Button>
              <Button
                disabled={sendingOtp}
                type="button"
                variant="outline"
                className="h-11 w-full rounded-md border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800/70"
                onClick={() => void handleSendOtp()}
              >
                {sendingOtp ? "Resending..." : "Resend passcode"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full rounded-md text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100"
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
        </div>
      </form>

      <hr className="my-7 border-zinc-800" />
      <p className="font-mono text-xs text-zinc-500">
        CLI:
        <br />
        ttteam login {email || "you@company.com"}
      </p>
    </div>
  );
}
