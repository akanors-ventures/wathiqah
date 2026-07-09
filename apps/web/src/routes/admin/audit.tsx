import { createFileRoute } from "@tanstack/react-router";
import { AuditLogTable } from "@/components/admin/AuditLogTable";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Audit log</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every provisioning and role change, with the admin who performed it.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}
