import { Link } from "@tanstack/react-router";
import bossLogo from "../../boss.png";
import { Button } from "@/components/ui/button";

const PRIMARY_BUTTON_CLASS =
  "border border-emerald-700 bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800/80";

export function HomePage(): React.JSX.Element {
  return (
    <div className="w-full max-w-[560px] rounded-lg border border-zinc-800 bg-zinc-900/95 p-8 text-zinc-200 shadow-[0_24px_90px_-50px_rgba(0,0,0,1)] md:p-10">
      <div className="text-center">
        <img
          src={bossLogo}
          alt="Teamteamteam boss logo"
          className="mx-auto mb-5 h-44 w-44 rounded-lg object-contain md:h-52 md:w-52"
        />
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Teamteamteam</h1>
        <p className="mt-1 text-sm text-zinc-400">Terminal-first Kanban</p>
      </div>

      <div className="mt-8 border-t border-zinc-800 pt-6 text-center">
        <p className="mb-5 text-sm text-zinc-400">
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
