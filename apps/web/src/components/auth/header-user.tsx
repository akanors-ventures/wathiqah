import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  FileSignature,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TierBadge } from "@/components/ui/tier-badge";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";

export default function HeaderUser() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const { tier, isPro } = useSubscription();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On the server or during the first client pass, always render the skeleton
  // to avoid hydration mismatches.
  if (!mounted) {
    return <div className="h-10 w-10 bg-muted animate-pulse rounded-full" aria-hidden="true" />;
  }

  // Use a more robust check for authenticated state
  const isCurrentlyAuthenticated =
    typeof isAuthenticated === "function" ? isAuthenticated() : !!isAuthenticated;

  if (loading || (user === undefined && isCurrentlyAuthenticated)) {
    return (
      <div
        className="h-10 w-10 bg-muted animate-pulse rounded-full"
        role="img"
        aria-label="Loading user profile"
      />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/login" search={{ redirectTo: undefined }}>
            Sign in
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  const displayName = user.name || user.email;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-12 w-auto gap-2 rounded-md pl-2 pr-3 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-200 group data-[state=open]:bg-muted/50 shrink-0"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9 border border-border transition-transform group-hover:scale-105 group-active:scale-95">
                  <AvatarImage src={undefined} alt={displayName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Account options</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold leading-none truncate max-w-[120px]">
                  {user.name || "User"}
                </p>
                <div className="flex items-center gap-1">
                  {user.isSupporter && <SupporterBadge showIcon={false} className="px-1.5" />}
                  <TierBadge tier={tier} />
                </div>
              </div>
              <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isPro && (
            <>
              <DropdownMenuItem
                asChild
                className="text-primary focus:text-primary focus:bg-primary/5 cursor-pointer font-bold"
              >
                <Link to="/pricing">
                  <Zap className="mr-2 h-4 w-4 fill-primary" />
                  <span>Upgrade to Pro</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <Link to="/promises" className="cursor-pointer">
              <FileSignature className="mr-2 h-4 w-4" />
              <span>My Promises</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                  {theme === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                  {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="mr-2 h-4 w-4" />
                  <span>System</span>
                  {theme === "system" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="text-red-600 focus:text-red-600 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
