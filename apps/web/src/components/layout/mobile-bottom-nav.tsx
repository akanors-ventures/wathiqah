import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  CalendarDays,
  FileSignature,
  FolderKanban,
  Handshake,
  History,
  MoreHorizontal,
  PenLine,
  Settings,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
};

type SheetItem = {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
};

// ─── NavTab ───────────────────────────────────────────────────────────────────

function NavTab({ tab, pathname, isOrgMode }: { tab: Tab; pathname: string; isOrgMode: boolean }) {
  const { href, label, icon: Icon, exact } = tab;
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      to={href as never}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
        isActive
          ? isOrgMode
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-primary"
          : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5 transition-transform" strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
    </Link>
  );
}

// ─── MoreSheet ────────────────────────────────────────────────────────────────

function MoreSheet({
  items,
  isOrgMode,
  open,
  onOpenChange,
}: {
  items: SheetItem[];
  isOrgMode: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { isPro } = useSubscription();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t shadow-2xl",
            "bg-background pb-safe",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "duration-300",
            isOrgMode ? "border-emerald-200 dark:border-emerald-800" : "border-border",
          )}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Close */}
          <DialogPrimitive.Close className="absolute right-4 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          {/* Header */}
          <div className="px-5 pb-3 pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              More
            </p>
          </div>

          {/* Items */}
          <nav className="px-3 pb-4 space-y-0.5">
            {items.map(({ label, description, href, icon: Icon, iconColor }) => (
              <DialogPrimitive.Close asChild key={href}>
                <Link
                  to={href as never}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/70 transition-colors"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isOrgMode ? "bg-emerald-50 dark:bg-emerald-950" : "bg-muted",
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5", iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">
                      {label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </Link>
              </DialogPrimitive.Close>
            ))}
          </nav>

          {/* Go Pro nudge */}
          {user && !isPro && (
            <div className="mx-3 mb-4 mt-1">
              <DialogPrimitive.Close asChild>
                <Link
                  to="/pricing"
                  search={{ reason: undefined }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 bg-primary/8 border border-primary/20 hover:bg-primary/12 transition-colors"
                >
                  <Zap className="h-4 w-4 fill-primary text-primary shrink-0" />
                  <div>
                    <p className="text-[13px] font-bold text-primary">Go Pro</p>
                    <p className="text-[11px] text-muted-foreground">Unlock all features</p>
                  </div>
                </Link>
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Safe area spacer */}
          <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── MobileBottomNav ──────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const { activeOrg, isOrgMode } = useOrgContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sheetOpen, setSheetOpen] = useState(false);

  const orgTabs: Tab[] = activeOrg
    ? [
        { label: "Ledger", href: "/transactions", icon: ArrowRightLeft },
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

  // Items shown in the "More" sheet vary by mode
  const orgMoreItems: SheetItem[] = [
    {
      label: "Contacts",
      description: "People you transact with",
      href: "/contacts",
      icon: Users,
      iconColor: "text-indigo-500",
    },
    {
      label: "My Records",
      description: "Transactions you appear in",
      href: "/transactions/my-contact-transactions",
      icon: History,
      iconColor: "text-orange-500",
    },
    {
      label: "Witnesses",
      description: "Transaction witness requests",
      href: "/witnesses",
      icon: FileSignature,
      iconColor: "text-purple-500",
    },
    {
      label: "Features",
      description: "What Wathīqah can do",
      href: "/features",
      icon: Sparkles,
      iconColor: "text-amber-500",
    },
    {
      label: "Pricing",
      description: "Plans & upgrades",
      href: "/pricing",
      icon: Zap,
      iconColor: "text-primary",
    },
  ];

  const personalMoreItems: SheetItem[] = [
    {
      label: "Notes",
      description: "Private notes on your interactions",
      href: "/notes",
      icon: PenLine,
      iconColor: "text-amber-500",
    },
    {
      label: "My Records",
      description: "Transactions you appear in",
      href: "/transactions/my-contact-transactions",
      icon: History,
      iconColor: "text-orange-500",
    },
    {
      label: "Witnesses",
      description: "Transaction witness requests",
      href: "/witnesses",
      icon: FileSignature,
      iconColor: "text-purple-500",
    },
    {
      label: "Features",
      description: "What Wathīqah can do",
      href: "/features",
      icon: Sparkles,
      iconColor: "text-amber-500",
    },
    {
      label: "Pricing",
      description: "Plans & upgrades",
      href: "/pricing",
      icon: Zap,
      iconColor: "text-primary",
    },
  ];

  const moreItems = isOrgMode ? orgMoreItems : personalMoreItems;
  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40",
          "border-t backdrop-blur-md bg-background/95",
          isOrgMode
            ? "border-emerald-200 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/95"
            : "border-border",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch h-14">
          {tabs.map((tab) => (
            <NavTab key={tab.href} tab={tab} pathname={pathname} isOrgMode={isOrgMode} />
          ))}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
              isMoreActive || sheetOpen
                ? isOrgMode
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-primary"
                : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={isMoreActive || sheetOpen ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-wide">More</span>
          </button>
        </div>
      </nav>

      <MoreSheet
        items={moreItems}
        isOrgMode={isOrgMode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
