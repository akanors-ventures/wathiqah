import { createFileRoute } from "@tanstack/react-router";
import { PlansTable } from "@/components/admin/PlansTable";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

function PlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Plans</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recurring Flutterwave payment plans — the source of truth checkout reads from. Sync
          existing plans from the Flutterwave dashboard, or create new ones here.
        </p>
      </div>

      <PlansTable />
    </div>
  );
}
