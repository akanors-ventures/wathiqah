import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const Route = createFileRoute("/admin/users/")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Users</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the user base, review accounts, and manage roles and Pro provisioning.
        </p>
      </div>
      <AdminUsersTable />
    </div>
  );
}
