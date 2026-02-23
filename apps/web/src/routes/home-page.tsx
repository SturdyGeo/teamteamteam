import { Link } from "@tanstack/react-router";
import bossLogo from "../../boss.png";
import { Button } from "@/components/ui/button";

export function HomePage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <img src={bossLogo} alt="Boss logo" className="h-28 w-28 object-contain" />
      <Button asChild className="rounded-full px-8">
        <Link to="/login">Sign in</Link>
      </Button>
    </div>
  );
}
