import { Link } from "@tanstack/react-router";
import bossLogo from "../../boss.png";
import { Button } from "@/components/ui/button";

const PRIMARY_BUTTON_CLASS =
  "border border-primary bg-primary text-primary-foreground hover:bg-primary/90";

export function HomePage(): React.JSX.Element {
  return (
    <div className="w-full max-w-[560px] rounded-lg border border-border bg-card p-8 text-card-foreground shadow-[0_24px_90px_-50px_hsl(var(--background))] md:p-10">
      <div className="text-center">
        <img
          src={bossLogo}
          alt="Teamteamteam boss logo"
          className="mx-auto mb-5 h-44 w-44 rounded-lg object-contain md:h-52 md:w-52"
        />
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Teamteamteam</h1>
        <p className="mt-1 text-sm text-muted-foreground">Terminal-first Kanban</p>
      </div>

      <div className="mt-8 border-t border-border pt-6 text-center">
        <p className="mb-5 text-sm text-muted-foreground">
          Corporate composure. Basement IT energy.
        </p>
        <Button
          asChild
          className={`rounded-md px-8 font-mono ${PRIMARY_BUTTON_CLASS}`}
        >
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
