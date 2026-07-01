import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  FileSignature,
  FolderKanban,
  Handshake,
  History,
  PenLine,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import HeaderUser from "../auth/header-user";

// ─── Nav item type ────────────────────────────────────────────────────────────

type NavItem = {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  description: string;
  href: string;
  // Dynamic-segment routes (e.g. /org/$slug/members) must navigate via
  // TanStack Router's typed `params`, not a pre-interpolated string passed
  // to `to`. A literal `to="/org/some-slug/members" as never` updates the
  // URL bar correctly but Route.useParams() comes back undefined on the
  // resulting client-side transition (it only resolves correctly on a full
  // document load, which re-parses the URL through route matching from
  // scratch) — causing the destination page's own slug-based org lookup to
  // report "not found" even though the org list has it.
  params?: Record<string, string>;
  search?: Record<string, string>;
  match: string; // prefix to test against pathname for active state
};

// ─── Header ──────────────────────────────────────────────────────────────────

export default function Header() {
  const { user } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const { isOrgMode, activeOrg } = useActiveOrg();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Ledger/Network: Transactions, My Records, Contacts, Promises, Projects,
  // and Witnesses are all backend org-scoped (@ActiveOrg() resolves orgId
  // from the JWT automatically) — same route in both modes, no frontend
  // branching needed; the org's data shows up automatically in org mode.
  // Only personal Notes has no org equivalent (org notes live under the
  // dedicated Events & Notes page instead), so it alone is hidden here.
  const ledgerItems: NavItem[] = [
    {
      icon: ArrowRightLeft,
      iconColor: "text-blue-500",
      label: "Transactions",
      description: "Funds, loans, gifts & payments",
      href: "/transactions",
      search: { tab: "funds" },
      match: "/transactions",
    },
    {
      icon: History,
      iconColor: "text-orange-500",
      label: "My Records",
      description: "Transactions you appear in",
      href: "/transactions/my-contact-transactions",
      match: "/transactions/my-contact-transactions",
    },
    {
      icon: FolderKanban,
      iconColor: "text-violet-500",
      label: "Projects",
      description: "Budget & expense tracking",
      href: "/projects",
      match: "/projects",
    },
  ];

  const networkItems: NavItem[] = [
    {
      icon: Users,
      iconColor: "text-indigo-500",
      label: "Contacts",
      description: "People you transact with",
      href: "/contacts",
      match: "/contacts",
    },
    {
      icon: Handshake,
      iconColor: "text-emerald-500",
      label: "Promises",
      description: "Track commitments & agreements",
      href: "/promises",
      match: "/promises",
    },
    {
      icon: FileSignature,
      iconColor: "text-purple-500",
      label: "Witnesses",
      description: "Transaction witness requests",
      href: "/witnesses",
      match: "/witnesses",
    },
    ...(isOrgMode
      ? []
      : [
          {
            icon: PenLine,
            iconColor: "text-amber-500",
            label: "Notes",
            description: "Private notes on your interactions",
            href: "/notes",
            match: "/notes",
          },
        ]),
  ];

  const orgItems: NavItem[] =
    isOrgMode && activeOrg
      ? [
          {
            icon: CalendarDays,
            iconColor: "text-blue-500",
            label: "Events & Notes",
            description: "Org-wide dates, schedules & records",
            href: "/org/$slug/events",
            params: { slug: activeOrg.slug },
            match: `/org/${activeOrg.slug}/events`,
          },
          {
            icon: Users,
            iconColor: "text-emerald-500",
            label: "Members",
            description: "Manage who has access",
            href: "/org/$slug/members",
            params: { slug: activeOrg.slug },
            match: `/org/${activeOrg.slug}/members`,
          },
          {
            icon: Settings,
            iconColor: "text-muted-foreground",
            label: "Settings",
            description: "Organisation profile & preferences",
            href: "/org/$slug/settings",
            params: { slug: activeOrg.slug },
            match: `/org/${activeOrg.slug}/settings`,
          },
        ]
      : [];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm transition-colors duration-300",
        isOrgMode
          ? "border-emerald-200 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/95"
          : "border-border",
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-3 lg:gap-5 min-w-0">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02] shrink-0"
            aria-label="Wathīqah Home"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground shadow-sm group-hover:shadow-md">
              <AppLogo className="h-5 w-5" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/20 group-hover:ring-transparent transition-all duration-300" />
            </div>
            <span className="hidden lg:block font-bold text-xl leading-none tracking-tight text-primary whitespace-nowrap">
              Wathīqah
            </span>
          </Link>

          {/* Desktop nav — hidden on mobile (bottom nav handles it) */}
          <nav className="hidden md:flex items-center gap-0.5">
            <NavDropdown
              label="Ledger"
              items={ledgerItems}
              pathname={pathname}
              isOrgMode={isOrgMode}
            />
            <NavDropdown
              label="Network"
              items={networkItems}
              pathname={pathname}
              isOrgMode={isOrgMode}
            />
            {orgItems.length > 0 && (
              <NavDropdown
                label="Organisation"
                items={orgItems}
                pathname={pathname}
                isOrgMode={isOrgMode}
              />
            )}
            <NavLink to="/features" pathname={pathname}>
              Features
            </NavLink>
            <NavLink to="/pricing" pathname={pathname}>
              Pricing
            </NavLink>
          </nav>
        </div>

        {/* Right: Go Pro + user menu (context switcher is inside the menu) */}
        <div className="flex items-center gap-2 shrink-0">
          {user && !isPro && !subLoading && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden lg:flex h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 animate-in fade-in slide-in-from-right duration-500"
            >
              <Link to="/pricing" search={{ reason: undefined }}>
                <Zap className="w-3 h-3 fill-primary" />
                Go Pro
              </Link>
            </Button>
          )}
          <HeaderUser />
        </div>
      </div>
    </header>
  );
}

// ─── NavLink ─────────────────────────────────────────────────────────────────

function NavLink({
  to,
  pathname,
  children,
}: {
  to: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const isActive = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={cn(
        "relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors",
        isActive
          ? "text-primary bg-primary/8"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

// ─── NavDropdown ─────────────────────────────────────────────────────────────

function NavDropdown({
  label,
  items,
  pathname,
  isOrgMode,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  isOrgMode: boolean;
}) {
  const isAnyActive = items.some((item) => pathname.startsWith(item.match));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative h-9 px-3.5 text-sm font-medium rounded-lg transition-colors gap-1.5",
            isAnyActive
              ? "text-primary bg-primary/8 hover:bg-primary/12"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            "data-[state=open]:bg-muted/60 data-[state=open]:text-foreground",
          )}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          {isAnyActive && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 p-2 mt-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
        sideOffset={4}
      >
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.match);
            return (
              <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent">
                <Link
                  to={item.href as never}
                  params={item.params as never}
                  search={item.search as never}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group cursor-pointer",
                    isActive ? "bg-primary/8 text-primary" : "hover:bg-muted/70 text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10"
                        : isOrgMode
                          ? "bg-emerald-50 dark:bg-emerald-950 group-hover:bg-muted"
                          : "bg-muted group-hover:bg-muted/80",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : item.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[13px] font-semibold leading-tight",
                        isActive ? "text-primary" : "text-foreground",
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
