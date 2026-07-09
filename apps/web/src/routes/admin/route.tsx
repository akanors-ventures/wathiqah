import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/admin")({
  component: AdminRouteLayout,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function AdminRouteLayout() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
