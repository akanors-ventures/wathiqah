import { useNavigate } from "@tanstack/react-router";
import { Building2, ChevronDown, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AccountSwitcher() {
  const { user } = useAuth();
  const { activeOrg, myOrgs, switchToOrg, isOrgMode } = useOrgContext();
  const navigate = useNavigate();

  const initials = activeOrg
    ? activeOrg.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  const displayName = activeOrg
    ? activeOrg.name.length > 16
      ? `${activeOrg.name.slice(0, 14)}…`
      : activeOrg.name
    : `${user?.firstName ?? ""} ${user?.lastName?.[0] ?? ""}.`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 h-9 rounded-lg border transition-all duration-200",
            isOrgMode
              ? "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-200"
              : "border-border bg-background hover:bg-muted/50",
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold flex-shrink-0",
              isOrgMode
                ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {initials}
          </div>

          {/* Name + type */}
          <div className="flex flex-col items-start gap-0 min-w-0">
            <span className="text-[12px] font-semibold leading-none truncate max-w-[100px]">
              {displayName}
            </span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wide font-bold leading-none mt-0.5",
                isOrgMode ? "text-blue-500" : "text-muted-foreground",
              )}
            >
              {isOrgMode ? "Organisation" : "Personal"}
            </span>
          </div>

          <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 mt-1">
        {/* Personal */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
          Switch context
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => switchToOrg(null)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground text-[10px] font-bold flex-shrink-0">
            {`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-semibold leading-tight truncate">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[11px] text-muted-foreground">Personal</span>
          </div>
          {!isOrgMode && <span className="text-blue-500 text-sm font-bold flex-shrink-0">✓</span>}
        </DropdownMenuItem>

        {/* Orgs */}
        {myOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
              Organisations
            </DropdownMenuLabel>
            {myOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => switchToOrg(org.id)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] font-bold flex-shrink-0">
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
                  <span className="text-[11px] text-muted-foreground">
                    {org.industry ?? "Organisation"}
                  </span>
                </div>
                {activeOrg?.id === org.id && (
                  <span className="text-blue-500 text-sm font-bold flex-shrink-0">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Create org */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
          onClick={() => navigate({ to: "/org/create" })}
        >
          <Plus className="h-4 w-4" />
          <span className="text-[13px]">Create organisation</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
