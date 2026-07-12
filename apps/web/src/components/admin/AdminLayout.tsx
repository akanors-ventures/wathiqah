import { Link, useRouterState } from "@tanstack/react-router";
import {
  CreditCard,
  LayoutDashboard,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { isPlatformAdmin } from "@/utils/auth";

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", href: "/admin/users", icon: Users, exact: false },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: Sparkles, exact: false },
  { label: "Plans", href: "/admin/plans", icon: CreditCard, exact: false },
  { label: "Audit Log", href: "/admin/audit", icon: ScrollText, exact: false },
] as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading || user === undefined) return <BrandLoader />;

  if (!isPlatformAdmin(user?.role)) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The admin area is restricted to platform administrators. If you believe this is a mistake,
          contact a super admin.
        </p>
        <Link
          to="/"
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Control-plane banner — indigo accent, distinct from personal (green) and org (emerald) */}
      <div className="border-b border-indigo-200/70 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight tracking-tight sm:text-xl">
                Admin Console
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-widest text-indigo-600/70 dark:text-indigo-400/70">
                Platform administration
              </p>
            </div>
          </div>

          {/* Sub-nav */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-px">
            {NAV.map(({ label, href, icon: Icon, exact }) => {
              const isActive = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    "relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
