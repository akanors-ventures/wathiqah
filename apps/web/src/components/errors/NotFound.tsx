import { Link } from "@tanstack/react-router";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFound() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
			<div className="mb-6 rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
				<FileQuestion className="h-12 w-12 text-neutral-400 dark:text-neutral-500" />
			</div>
			<h1 className="mb-2 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
				Page not found
			</h1>
			<p className="mb-8 max-w-md text-neutral-500 dark:text-neutral-400">
				Sorry, we couldn't find the page you're looking for. It might have been
				moved, deleted, or never existed.
			</p>
			<Button
				asChild
				size="lg"
				className="bg-emerald-600 hover:bg-emerald-700 text-white"
			>
				<Link to="/">
					<Home className="mr-2 h-4 w-4" />
					Back to Home
				</Link>
			</Button>
		</div>
	);
}
