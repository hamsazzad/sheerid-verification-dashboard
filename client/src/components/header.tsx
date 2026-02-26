import { Button } from "@/components/ui/button";
import { Moon, Sun, Shield } from "lucide-react";
import { useTheme } from "./theme-provider";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl" data-testid="header">
      <div className="flex items-center justify-between gap-4 px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">SheerID Verification</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Tool Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
