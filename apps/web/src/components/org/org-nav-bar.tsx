import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, Settings, Users } from "lucide-react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { cn } from "@/lib/utils";

export function OrgNavBar() {
  const { activeOrg, isOrgMode } = useActiveOrg();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Only render on org-scoped pages
  if (!isOrgMode || !activeOrg || !pathname.startsWith("/org/")) return null;

  const base = `/org/${activeOrg.slug}`;

  const tabs = [
    { label: "Dashboard", href: base, icon: LayoutGrid, exact: true },
    { label: "Events & Notes", href: `${base}/events`, icon: CalendarDays, exact: false },
    { label: "Members", href: `${base}/members`, icon: Users, exact: false },
    { label: "Settings", href: `${base}/settings`, icon: Settings, exact: false },
  ];

  return (
    <div className="hidden md:block sticky top-16 z-40 w-full border-b border-blue-200 bg-blue-50/95 dark:border-blue-800 dark:bg-blue-950/95 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          className="flex items-center overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
          aria-label="Organisation navigation"
        >
          {tabs.map(({ label, href, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href as never}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold",
                  "whitespace-nowrap border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                    : "border-transparent text-blue-900/50 dark:text-blue-300/50 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-300",
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
