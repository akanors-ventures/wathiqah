import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgRole } from "@/types/__generated__/graphql";

// Use the query-result shape, not the full schema type
interface MemberUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MemberData {
  id: string;
  userId: string;
  role: OrgRole;
  joinedAt: string;
  user: MemberUser;
}

const ROLE_BADGE_CLASS: Record<OrgRole, string> = {
  [OrgRole.Admin]: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
  [OrgRole.Operator]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [OrgRole.Viewer]: "bg-muted text-muted-foreground",
};

interface MemberRowProps {
  member: MemberData;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onRoleChange?: (memberId: string, role: OrgRole) => void;
  onRemove?: (memberId: string) => void;
}

export function MemberRow({
  member,
  isCurrentUser,
  isAdmin,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const initials =
    `${member.user.firstName?.[0] ?? "?"}${member.user.lastName?.[0] ?? "?"}`.toUpperCase();
  const name = `${member.user.firstName} ${member.user.lastName}`;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      {/* Avatar */}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground text-[12px] font-bold flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold truncate">{name}</p>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              You
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{member.user.email}</p>
      </div>

      {/* Role */}
      {isAdmin && !isCurrentUser ? (
        <Select
          value={member.role}
          onValueChange={(value) => onRoleChange?.(member.id, value as OrgRole)}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OrgRole.Admin}>Admin</SelectItem>
            <SelectItem value={OrgRole.Operator}>Operator</SelectItem>
            <SelectItem value={OrgRole.Viewer}>Viewer</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge className={`text-[10px] font-bold uppercase ${ROLE_BADGE_CLASS[member.role]}`}>
          {member.role}
        </Badge>
      )}

      {/* Remove */}
      {isAdmin && !isCurrentUser && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove?.(member.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
