import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
	component: SignupComponent,
});

function SignupComponent() {
	const { signup } = useAuth();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isSuccess, setIsSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await signup({ name, email, password });
			setIsSuccess(true);
		} catch (err: any) {
			setError(err.message || "Failed to sign up");
		}
	};

	const id = useId();

	if (isSuccess) {
		return (
			<div className="flex flex-1 items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border text-center">
					<div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
						<CheckCircle2 className="w-6 h-6 text-primary" />
					</div>
					<h2 className="text-2xl font-bold text-foreground">
						Verify your email
					</h2>
					<p className="text-muted-foreground">
						We've sent a verification link to <strong>{email}</strong>. Please
						check your inbox to activate your account.
					</p>
					<Button
						asChild
						className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
					>
						<Link to="/login">Go to Login</Link>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground">
						Create an account
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							to="/login"
							className="font-medium text-primary hover:text-primary/90"
						>
							Sign in
						</Link>
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-4">
						<div>
							<Label htmlFor={`${id}-name`}>Full Name</Label>
							<Input
								id={`${id}-name`}
								type="text"
								placeholder="Ahmad Sulaiman"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="mt-1"
							/>
							<p className="text-[0.8rem] text-muted-foreground mt-1">
								First name first, last name last.
							</p>
						</div>
						<div>
							<Label htmlFor={`${id}-email`}>Email address</Label>
							<Input
								id={`${id}-email`}
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="mt-1"
							/>
						</div>
						<div>
							<Label htmlFor={`${id}-password`}>Password</Label>
							<PasswordInput
								id={`${id}-password`}
								required
								minLength={8}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="mt-1"
							/>
						</div>
					</div>

					{error && (
						<div className="text-destructive text-sm text-center">{error}</div>
					)}

					<Button type="submit" className="w-full">
						Sign up
					</Button>
				</form>
			</div>
		</div>
	);
}
