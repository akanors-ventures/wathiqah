import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  CalendarDays,
  FolderKanban,
  Handshake,
  LayoutGrid,
  Settings,
  Users,
} from "lucide-react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { cn } from "@/lib/utils";

type Tab = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
};

function NavTab({ tab, pathname }: { tab: Tab; pathname: string }) {
  const { href, label, icon: Icon, exact } = tab;
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      to={href as never}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon
        className={cn("h-5 w-5 transition-transform", isActive && "scale-110")}
        strokeWidth={isActive ? 2.5 : 2}
      />
      <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const { activeOrg, isOrgMode } = useActiveOrg();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const orgTabs: Tab[] = activeOrg
    ? [
        { label: "Dashboard", href: `/org/${activeOrg.slug}`, icon: LayoutGrid, exact: true },
        { label: "Events", href: `/org/${activeOrg.slug}/events`, icon: CalendarDays },
        { label: "Members", href: `/org/${activeOrg.slug}/members`, icon: Users },
        { label: "Settings", href: `/org/${activeOrg.slug}/settings`, icon: Settings },
      ]
    : [];

  const personalTabs: Tab[] = [
    { label: "Ledger", href: "/transactions", icon: ArrowRightLeft },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "Promises", href: "/promises", icon: Handshake },
  ];

  const tabs = isOrgMode && orgTabs.length ? orgTabs : personalTabs;

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t backdrop-blur-md bg-background/95",
        isOrgMode
          ? "border-blue-200 bg-blue-50/95 dark:border-blue-800 dark:bg-blue-950/95"
          : "border-border",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-14">
        {tabs.map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
