import { Link } from "@tanstack/react-router";
import { ArrowRight, MoreVertical, Wallet } from "lucide-react";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ContactSummary {
  id: string;
  name?: string | null;
  balance: number;
  email?: string | null;
  phoneNumber?: string | null;
  isOnPlatform?: boolean;
  hasPendingInvitation?: boolean;
  lentCount?: number;
  borrowedCount?: number;
}

interface ContactCardProps<T extends ContactSummary = ContactSummary> {
  contact: T;
  onEdit?: (contact: T) => void;
  onDelete?: (contact: T) => void;
  onInvite?: (id: string) => void;
  className?: string;
  showActions?: boolean;
}

export function ContactCard<T extends ContactSummary>({
  contact,
  onEdit,
  onDelete,
  onInvite,
  className,
  showActions = true,
}: ContactCardProps<T>) {
  return (
    <div
      className={cn(
        "group relative bg-card border border-border/50 rounded-3xl transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/40 overflow-hidden flex flex-col p-5",
        className,
      )}
    >
      <div className="flex flex-col relative flex-1 gap-5">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-500">
                {contact.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border/50 shadow-md">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-inner",
                    contact.balance >= 0 ? "bg-emerald-500" : "bg-rose-500",
                  )}
                />
              </div>
            </div>
            <div className="min-w-0">
              <Link
                to="/contacts/$contactId"
                params={{ contactId: contact.id }}
                className="block group/name"
              >
                <h3 className="font-bold text-lg text-foreground truncate group-hover/name:text-primary transition-colors flex items-center gap-2 tracking-tight">
                  {contact.name ?? "Unnamed"}
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-3 group-hover/name:opacity-100 group-hover/name:translate-x-0 transition-all duration-300 text-primary/60" />
                </h3>
              </Link>
              <p className="text-[11px] text-muted-foreground truncate opacity-70">
                {contact.email || contact.phoneNumber || "No contact info"}
              </p>
              {(contact.lentCount ?? 0) > 0 || (contact.borrowedCount ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(contact.lentCount ?? 0) > 0 && (
                    <div className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] px-2 py-0.5 rounded-lg font-bold">
                      Lent: {contact.lentCount}
                    </div>
                  )}
                  {(contact.borrowedCount ?? 0) > 0 && (
                    <div className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px] px-2 py-0.5 rounded-lg font-bold">
                      Borrowed: {contact.borrowedCount}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-all"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 p-1.5 rounded-2xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/95"
              >
                <DropdownMenuItem
                  asChild
                  className="rounded-xl py-2.5 cursor-pointer focus:bg-primary/5 px-4"
                >
                  <Link
                    to="/contacts/$contactId"
                    params={{ contactId: contact.id }}
                    className="flex items-center w-full"
                  >
                    <span className="font-bold text-sm">View Profile</span>
                  </Link>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(contact)}
                    className="rounded-xl py-2.5 cursor-pointer focus:bg-primary/5 px-4"
                  >
                    <span className="font-bold text-sm">Edit Contact</span>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <div className="h-px bg-border/50 my-1 mx-2" />
                    <DropdownMenuItem
                      onClick={() => onDelete(contact)}
                      className="rounded-xl py-2.5 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 px-4"
                    >
                      <span className="font-bold text-sm">Delete Contact</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 mt-auto">
          <div className="flex flex-col">
            <p className="text-[10px] text-muted-foreground font-bold mb-0.5 flex items-center gap-1.5 opacity-60">
              <Wallet className="w-3 h-3 text-primary/60" /> Standing
            </p>
            <BalanceIndicator
              amount={contact.balance}
              currency="NGN"
              className="text-base font-bold py-0 px-0 h-auto shadow-none border-none bg-transparent dark:bg-transparent w-fit"
            />
          </div>
          <div className="flex items-center">
            {contact.isOnPlatform ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600">On Platform</span>
              </div>
            ) : contact.hasPendingInvitation ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/5 border border-amber-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600">Invited</span>
                </div>
                {onInvite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onInvite(contact.id)}
                    className="h-7 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all"
                  >
                    Resend
                  </Button>
                )}
              </div>
            ) : onInvite && contact.email ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInvite(contact.id)}
                className="h-8 rounded-md text-[11px] font-bold border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all px-4"
              >
                Invite
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
