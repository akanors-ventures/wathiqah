import { useMutation, useQuery } from "@apollo/client/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { useOrgFromSlug } from "@/hooks/use-org-from-slug";
import {
  MY_ORGANISATIONS_QUERY,
  UPDATE_ORGANISATION_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type { UpdateOrganisationInput } from "@/types/__generated__/graphql";
import { AttributionMode, OrgRole } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/$slug/settings")({
  component: SettingsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function SettingsPage() {
  const { slug } = Route.useParams();
  const { isSyncing } = useOrgFromSlug(slug);
  const { user } = useAuth();
  const nameId = useId();
  const industryId = useId();
  const descriptionId = useId();

  // Use OrgContext for the org so this page doesn't race with useOrgFromSlug.
  // Keep the per-page query only for refetch after saving settings.
  const { myOrgs } = useOrgContext();
  const { data, refetch } = useQuery(MY_ORGANISATIONS_QUERY);
  const org =
    myOrgs.find((o) => o.slug === slug) ??
    data?.myOrganisations.find((o) => o.slug === slug) ??
    null;

  const isAdmin = org?.members.find((m) => m.userId === user?.id)?.role === OrgRole.Admin;

  const [updateOrganisation, { loading: saving }] = useMutation(UPDATE_ORGANISATION_MUTATION);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateOrganisationInput>();

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        description: org.description ?? undefined,
        industry: org.industry ?? undefined,
        attributionMode: org.attributionMode ?? AttributionMode.OrgOnly,
      });
    }
  }, [org, reset]);

  async function onSubmit(formData: UpdateOrganisationInput) {
    try {
      await updateOrganisation({ variables: { input: formData } });
      await refetch();
      toast.success("Organisation settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  if (isSyncing || !org || !user) return <BrandLoader />;

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <p className="text-sm text-muted-foreground">
          Only admins can manage organisation settings.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organisation profile and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor={nameId}>Organisation name</Label>
          <Input
            id={nameId}
            placeholder="Acme Corp"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={industryId}>Industry</Label>
          <Input
            id={industryId}
            placeholder="e.g. Technology, Finance, Healthcare"
            {...register("industry")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={descriptionId}>Description</Label>
          <Textarea
            id={descriptionId}
            placeholder="A short description of your organisation"
            rows={3}
            {...register("description")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Attribution mode</Label>
          <Select
            value={watch("attributionMode") ?? AttributionMode.OrgOnly}
            onValueChange={(v) => setValue("attributionMode", v as AttributionMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AttributionMode.OrgOnly}>
                Organisation name only (default)
              </SelectItem>
              <SelectItem value={AttributionMode.OrgAndOperator}>
                Organisation + staff member name
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls how your org appears in transaction notifications sent to contacts.
          </p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
