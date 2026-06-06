import { useMutation, useQuery } from "@apollo/client/react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MemberRow } from "@/components/org/member-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader } from "@/components/ui/page-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { useOrgFromSlug } from "@/hooks/use-org-from-slug";
import {
  INVITE_MEMBER_MUTATION,
  MY_ORGANISATIONS_QUERY,
  REMOVE_MEMBER_MUTATION,
  UPDATE_MEMBER_ROLE_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type { InviteMemberInput } from "@/types/__generated__/graphql";
import { OrgRole } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/$slug/members")({
  component: MembersPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function MembersPage() {
  const { slug } = Route.useParams();
  useOrgFromSlug(slug);
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Use OrgContext for the org so this page doesn't race with useOrgFromSlug.
  // Keep the per-page query only for refetch after mutations (cache update).
  const { activeOrg, loadingOrgs } = useOrgContext();
  const { data, refetch } = useQuery(MY_ORGANISATIONS_QUERY);
  const org =
    activeOrg?.slug === slug
      ? activeOrg
      : (data?.myOrganisations.find((o) => o.slug === slug) ?? null);
  const members = org?.members ?? [];

  const currentMember = members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === OrgRole.Admin;

  const [inviteMember, { loading: inviting, error: inviteError }] =
    useMutation(INVITE_MEMBER_MUTATION);
  const [updateRole] = useMutation(UPDATE_MEMBER_ROLE_MUTATION);
  const [removeMember] = useMutation(REMOVE_MEMBER_MUTATION);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    defaultValues: { role: OrgRole.Operator },
  });

  async function onInvite(formData: InviteMemberInput) {
    await inviteMember({
      variables: { input: formData },
    });
    await refetch();
    reset();
    setInviteOpen(false);
  }

  async function handleRoleChange(memberId: string, role: OrgRole) {
    try {
      await updateRole({ variables: { memberId, role } });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the organisation?")) return;
    try {
      await removeMember({ variables: { memberId } });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  if (loadingOrgs || !org) return <BrandLoader />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} {members.length === 1 ? "member" : "members"} in this organisation
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onInvite)} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Email address</Label>
                  <Input
                    placeholder="member@example.com"
                    {...register("email", { required: "Email is required" })}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={watch("role")}
                    onValueChange={(v) => setValue("role", v as OrgRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OrgRole.Operator}>
                        Operator — can create records
                      </SelectItem>
                      <SelectItem value={OrgRole.Viewer}>Viewer — read-only access</SelectItem>
                      <SelectItem value={OrgRole.Admin}>Admin — full control</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteError && <p className="text-sm text-destructive">{inviteError.message}</p>}
                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting ? "Inviting…" : "Send invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl px-4">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isCurrentUser={member.userId === user?.id}
            isAdmin={isAdmin ?? false}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
