import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";

const verifyEmailSearchSchema = z.object({
	token: z.string().min(1),
});

export const Route = createFileRoute("/verify-email")({
	validateSearch: (search) => verifyEmailSearchSchema.parse(search),
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const { token } = useSearch({ from: "/verify-email" });
	const navigate = useNavigate();
	const { verifyEmail } = useAuth();

	const [status, setStatus] = useState<"verifying" | "success" | "error">(
		"verifying",
	);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		const verify = async () => {
			try {
				await verifyEmail(token);
				if (mounted) {
					setStatus("success");
					setTimeout(() => {
						navigate({ to: "/" });
					}, 3000);
				}
			} catch (err: any) {
				if (mounted) {
					setStatus("error");
					setError(
						err.message || "Failed to verify email. The link may have expired.",
					);
				}
			}
		};

		verify();

		return () => {
			mounted = false;
		};
	}, [token, verifyEmail, navigate]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
			<div className="w-full max-w-md bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 text-center">
				{status === "verifying" && (
					<div className="space-y-4">
						<div className="mx-auto w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
						<h2 className="text-xl font-bold text-neutral-900 dark:text-white">
							Verifying your email...
						</h2>
						<p className="text-neutral-600 dark:text-neutral-400">
							Please wait while we verify your account.
						</p>
					</div>
				)}

				{status === "success" && (
					<div className="space-y-4">
						<div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
							<CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
						</div>
						<h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
							Email Verified!
						</h2>
						<p className="text-neutral-600 dark:text-neutral-400">
							Your account has been successfully verified. Redirecting you to
							the dashboard...
						</p>
					</div>
				)}

				{status === "error" && (
					<div className="space-y-6">
						<div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
							<XCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
						</div>
						<div className="space-y-2">
							<h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
								Verification Failed
							</h2>
							<p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
						</div>
						<Button
							asChild
							className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
						>
							<a href="/login">Go to Login</a>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
