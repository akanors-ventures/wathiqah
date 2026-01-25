import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function HeaderUser() {
	const { user, loading, logout } = useAuth();

	if (loading) {
		return <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />;
	}

	if (user) {
		return (
			<div className="flex items-center gap-2">
				<div className="h-8 w-8 bg-muted flex items-center justify-center rounded-full">
					<span className="text-xs font-medium text-muted-foreground">
						{user.name?.charAt(0).toUpperCase() || "U"}
					</span>
				</div>
				<Button variant="outline" size="sm" onClick={() => logout()}>
					Sign out
				</Button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Button asChild variant="ghost" size="sm">
				<Link to="/login">Sign in</Link>
			</Button>
			<Button asChild size="sm">
				<Link to="/signup">Sign up</Link>
			</Button>
		</div>
	);
}
