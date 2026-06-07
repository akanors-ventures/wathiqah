import { useMutation } from "@apollo/client/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOrgContext } from "@/context/OrgContext";
import { useSubscription } from "@/hooks/useSubscription";
import { CREATE_ORGANISATION_MUTATION } from "@/lib/apollo/queries/organisations";
import type { CreateOrganisationInput } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/create")({
  component: CreateOrgPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function CreateOrgPage() {
  const { isPro, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { switchToOrg } = useOrgContext();
  const [createOrg, { loading, error }] = useMutation(CREATE_ORGANISATION_MUTATION);
  const nameId = useId();
  const industryId = useId();
  const descriptionId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganisationInput>();

  useEffect(() => {
    if (!subLoading && !isPro) {
      void navigate({ to: "/pricing", search: { reason: "org-creation" } });
    }
  }, [isPro, subLoading, navigate]);

  if (subLoading || !isPro) return null;

  async function onSubmit(data: CreateOrganisationInput) {
    const { data: result } = await createOrg({ variables: { input: data } });
    if (result?.createOrganisation) {
      // Switch to the new org context immediately
      await switchToOrg(result.createOrganisation.id);
      navigate({ to: `/org/${result.createOrganisation.slug}` });
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 mb-4">
          <Building2 className="h-7 w-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Create an Organisation</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Set up a shared workspace for your team — separate from your personal ledger.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor={nameId}>Organisation name *</Label>
          <Input
            id={nameId}
            placeholder="e.g. Akanors Integrated Farm"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={industryId}>
            Industry <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id={industryId}
            placeholder="e.g. Agriculture, Cooperative, NGO"
            {...register("industry")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={descriptionId}>
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id={descriptionId}
            placeholder="What does your organisation do?"
            rows={3}
            {...register("description")}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create Organisation"}
        </Button>
      </form>
    </div>
  );
}
