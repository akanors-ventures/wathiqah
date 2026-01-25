import { Link } from "@tanstack/react-router";
import HeaderUser from "../auth/header-user";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				<div className="flex items-center gap-8">
					<Link to="/" className="flex items-center gap-2 font-bold text-xl">
						<span className="text-primary">Wathȋqah</span>
					</Link>

					<nav className="hidden md:flex items-center gap-6">
						<Link
							to="/contacts"
							className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors [&.active]:text-primary"
						>
							Contacts
						</Link>
						<Link
							to="/witnesses"
							className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors [&.active]:text-primary"
						>
							Witness Requests
						</Link>
					</nav>
				</div>

				<div className="flex items-center gap-4">
					<HeaderUser />
				</div>
			</div>
		</header>
	);
}
