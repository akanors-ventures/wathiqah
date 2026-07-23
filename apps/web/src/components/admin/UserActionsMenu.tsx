import { MoreHorizontal, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useAdminMutations } from "@/hooks/useAdmin";
import { SubscriptionTier, UserRole } from "@/types/__generated__/graphql";
import { isSuperAdmin } from "@/utils/auth";
import { ROLE_LABEL } from "./admin-format";

export interface AdminUserLike {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
  role: UserRole;
}

/** YYYY-MM-DD for a date input, using the browser's local calendar date (not UTC). */
export function localDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return localDateString(d);
}

/** Builds an ISO end-of-day instant for the exact calendar date picked, independent of the viewer's timezone. */
export function endOfDayIso(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
}

/** Row/detail actions for a user: provision Pro, revoke Pro, change role. */
export function UserActionsMenu({
  user,
  trigger,
}: {
  user: AdminUserLike;
  trigger?: React.ReactNode;
}) {
  const { user: viewer } = useAuth();
  const viewerIsSuper = isSuperAdmin(viewer?.role);
  const { provisionPro, deprovisionPro, setUserRole, provisioning, deprovisioning, settingRole } =
    useAdminMutations();

  const [dialog, setDialog] = useState<null | "provision" | "revoke" | "role">(null);
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());
  const [role, setRole] = useState<UserRole>(
    user.role === UserRole.Admin ? UserRole.Admin : UserRole.User,
  );
  const expiryId = useId();

  const isPro = user.tier === SubscriptionTier.Pro;
  const targetIsSuper = user.role === UserRole.SuperAdmin;

  async function handleProvision() {
    try {
      await provisionPro({
        userId: user.id,
        expiresAt: endOfDayIso(expiresAt),
      });
      toast.success(`Pro provisioned for ${user.name}`);
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to provision Pro");
    }
  }

  async function handleRevoke() {
    try {
      await deprovisionPro(user.id);
      toast.success(`Pro revoked for ${user.name}`);
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke Pro");
    }
  }

  async function handleRole() {
    try {
      await setUserRole({ userId: user.id, role });
      toast.success(`${user.name} is now ${ROLE_LABEL[role]}`);
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          {trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setDialog("provision")}>
            <Sparkles className="h-4 w-4 text-emerald-500" />
            {isPro ? "Extend Pro" : "Provision Pro"}
          </DropdownMenuItem>
          {isPro && (
            <DropdownMenuItem
              onSelect={() => setDialog("revoke")}
              className="text-rose-600 focus:text-rose-600 dark:text-rose-400"
            >
              <XCircle className="h-4 w-4" />
              Revoke Pro
            </DropdownMenuItem>
          )}
          {viewerIsSuper && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={targetIsSuper}
                onSelect={() => {
                  setRole(user.role === UserRole.Admin ? UserRole.Admin : UserRole.User);
                  setDialog("role");
                }}
              >
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                Change role
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Provision / Extend Pro */}
      <Dialog open={dialog === "provision"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{isPro ? "Extend Pro access" : "Provision Pro access"}</DialogTitle>
            <DialogDescription>
              Grant complimentary Pro to <span className="font-semibold">{user.name}</span> (
              {user.email}). Set the date it should expire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={expiryId}>Expires on</Label>
            <DatePicker
              id={expiryId}
              value={expiresAt}
              min={localDateString(new Date())}
              onChange={setExpiresAt}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleProvision} isLoading={provisioning}>
              {isPro ? "Extend Pro" : "Provision Pro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Pro */}
      <AlertDialog open={dialog === "revoke"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Pro access?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately downgrades <span className="font-semibold">{user.name}</span> to the
              Free tier and cancels their provisioned subscription. They will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevoke();
              }}
              disabled={deprovisioning}
              className="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600"
            >
              Revoke Pro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change role (super admin only) */}
      <Dialog open={dialog === "role"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Set the platform role for <span className="font-semibold">{user.name}</span>. Admins
              can manage users and provisioning; only a super admin can change roles.
            </DialogDescription>
          </DialogHeader>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.User}>{ROLE_LABEL[UserRole.User]}</SelectItem>
              <SelectItem value={UserRole.Admin}>{ROLE_LABEL[UserRole.Admin]}</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleRole} isLoading={settingRole}>
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
