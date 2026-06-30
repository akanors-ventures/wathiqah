import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronDown,
  FileSignature,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
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
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { TierBadge } from "@/components/ui/tier-badge";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export default function HeaderUser() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const { tier, isPro } = useSubscription();
  const { theme, setTheme } = useTheme();
  const {
    activeOrg,
    myOrgs,
    loadingOrgs,
    isOrgMode,
    switchToOrg,
    refetchOrgs,
    blockAutoSwitch,
    unblockAutoSwitch,
  } = useOrgContext();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On the server or during the first client pass, always render the skeleton
  // to avoid hydration mismatches.
  if (!mounted) {
    return <div className="h-9 w-36 bg-muted animate-pulse rounded-lg" aria-hidden="true" />;
  }

  if (loading || (user === undefined && isAuthenticated())) {
    return (
      <div
        className="h-9 w-36 bg-muted animate-pulse rounded-lg"
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

  async function handleSwitchToOrg(orgId: string, orgSlug: string) {
    if (isSwitching || activeOrg?.id === orgId) return;
    setIsSwitching(true);
    blockAutoSwitch();
    try {
      await switchToOrg(orgId);
      void navigate({ to: "/org/$slug", params: { slug: orgSlug } });
    } catch {
      toast.error("Failed to switch organisation. Please try again.");
    } finally {
      unblockAutoSwitch();
      setIsSwitching(false);
    }
  }

  async function handleSwitchToPersonal() {
    if (isSwitching || !isOrgMode) return;
    setIsSwitching(true);
    blockAutoSwitch();
    try {
      await switchToOrg(null);
      if (window?.location.pathname.startsWith("/org/")) {
        void navigate({ to: "/" });
      }
    } catch {
      toast.error("Failed to switch to personal. Please try again.");
      unblockAutoSwitch();
    } finally {
      setIsSwitching(false);
    }
    // Delay unblocking: unblocking immediately lets useOrgFromSlug on the still-
    // mounted org page see signal=null + activeOrg=null and counter-switch back.
    // 800 ms gives TanStack Router time to commit the navigation and unmount the
    // org route first.
    setTimeout(unblockAutoSwitch, 800);
  }

  // ── Trigger ───────────────────────────────────────────────────────────────

  const initials = activeOrg
    ? activeOrg.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  const displayName = activeOrg
    ? activeOrg.name.length > 16
      ? `${activeOrg.name.slice(0, 14)}…`
      : activeOrg.name
    : `${user.firstName ?? ""} ${user.lastName?.[0] ?? ""}.`;

  const otherOrgs = myOrgs.filter((o) => o.id !== activeOrg?.id);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        // The org list (myOrgs) is fetched once at app mount and can go
        // stale relative to org membership changes (creating/joining an org,
        // a switch-triggered background refetch still in flight) with no
        // automatic self-correction. Force a fresh fetch whenever the user
        // is about to look at it instead of risking a stale/empty list.
        if (open) void refetchOrgs();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isSwitching}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 h-9 rounded-lg border transition-all duration-200",
            isOrgMode
              ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-200"
              : "border-border bg-background hover:bg-muted/50",
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold flex-shrink-0",
              isOrgMode
                ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isSwitching ? <Loader2 className="h-3 w-3 animate-spin" /> : initials}
          </div>
          <div className="flex flex-col items-start gap-0 min-w-0">
            <span className="text-[12px] font-semibold leading-none truncate max-w-[100px]">
              {displayName}
            </span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wide font-bold leading-none mt-0.5",
                isOrgMode ? "text-emerald-500" : "text-muted-foreground",
              )}
            >
              {isSwitching ? "Switching…" : isOrgMode ? "Organisation" : "Personal"}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        {isOrgMode && activeOrg ? (
          // ── Org mode ──────────────────────────────────────────────────────
          <>
            {/* Org header */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white text-[11px] font-black">
                    {activeOrg.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none truncate">{activeOrg.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{user.name}</p>
                  </div>
                </div>
                <TierBadge tier={tier} />
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Switch context — kept near the top to match personal-mode layout */}
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1">
              Switch context
            </DropdownMenuLabel>

            {/* Personal */}
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isSwitching}
              onClick={handleSwitchToPersonal}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground text-[9px] font-bold mr-2">
                {`${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold leading-tight truncate">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[10px] text-muted-foreground">Personal</span>
              </div>
            </DropdownMenuItem>

            {/* Other orgs */}
            {otherOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="cursor-pointer"
                disabled={isSwitching}
                onClick={() => handleSwitchToOrg(org.id, org.slug)}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[9px] font-bold mr-2">
                  {org.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold leading-tight truncate">
                    {org.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {org.industry ?? "Organisation"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground">
              <Link to="/org/create">
                <Plus className="mr-2 h-4 w-4" />
                Create organisation
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Org nav — below context switcher */}
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1">
              Organisation
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to={`/org/${activeOrg.slug}/events` as never} className="cursor-pointer">
                <CalendarDays className="mr-2 h-4 w-4" />
                Events &amp; Notes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/org/${activeOrg.slug}/members` as never} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Members
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/org/${activeOrg.slug}/settings` as never} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        ) : (
          // ── Personal mode ─────────────────────────────────────────────────
          <>
            {/* Personal header */}
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

            {/* Org switching */}
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1">
              Organisations
            </DropdownMenuLabel>
            {loadingOrgs && myOrgs.length === 0 && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading organisations…
              </div>
            )}
            {myOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="cursor-pointer"
                disabled={isSwitching}
                onClick={() => handleSwitchToOrg(org.id, org.slug)}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[9px] font-bold mr-2">
                  {org.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold leading-tight truncate">
                    {org.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {org.industry ?? "Organisation"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            {isPro ? (
              <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground">
                <Link to="/org/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create organisation
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground">
                <Link to="/pricing" search={{ reason: "org-creation" }}>
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Create organisation</span>
                  <span className="ml-auto text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Pro
                  </span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />

            {/* Upgrade */}
            {!isPro && (
              <>
                <DropdownMenuItem
                  asChild
                  className="text-primary focus:text-primary focus:bg-primary/5 cursor-pointer font-bold"
                >
                  <Link to="/pricing" search={{ reason: undefined }}>
                    <Zap className="mr-2 h-4 w-4 fill-primary" />
                    <span>Upgrade to Pro</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Personal nav */}
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
          </>
        )}

        {/* Theme (always shown) */}
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
  );
}
