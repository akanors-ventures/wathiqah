import { createFileRoute } from "@tanstack/react-router";
import { AdminUserDetail } from "@/components/admin/AdminUserDetail";

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  return <AdminUserDetail userId={userId} />;
}
