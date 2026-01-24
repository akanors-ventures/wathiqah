import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { WitnessStatus } from "@/types/__generated__/graphql";
import { useWitnessInvitation } from "@/hooks/useWitnesses";
import { ACKNOWLEDGE_WITNESS } from "@/lib/apollo/queries/witnesses";

export const Route = createFileRoute("/witnesses/invite/$token")({
  component: InviteComponent,
});

function InviteComponent() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user: currentUser, acceptInvitation } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    invitation: witnessInvitation,
    loading,
    error: queryError,
  } = useWitnessInvitation(token);

  const [acknowledgeWitness, { loading: ackLoading }] =
    useMutation(ACKNOWLEDGE_WITNESS);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-500">Loading invitation...</p>
      </div>
    );
  }

  if (queryError || !witnessInvitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center max-w-md p-6 bg-white dark:bg-neutral-900 rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-500 mb-2">
            Invitation Error
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {queryError?.message || "Invalid or expired invitation token."}
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const { transaction, user: invitedUser } = witnessInvitation;
  const isExistingUser = !!invitedUser.passwordHash;
  const isCurrentUserInvited = currentUser?.email === invitedUser.email;

  const handleAcceptSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await acceptInvitation({ token, password });
      setSuccess("Account created successfully!");
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

  const handleAcknowledge = async (status: WitnessStatus) => {
    try {
      await acknowledgeWitness({
        variables: {
          input: {
            witnessId: witnessInvitation.id,
            status,
          },
        },
      });
      setSuccess(`Transaction ${status.toLowerCase()} successfully!`);
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-lg space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Witness Invitation
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            {transaction.createdBy.name} has invited you to witness a
            transaction.
          </p>
        </div>

        {/* Transaction Details Card */}
        <div className="bg-neutral-100 dark:bg-neutral-800 p-6 rounded-md space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-neutral-500">Amount</span>
            <span className="font-bold text-lg text-neutral-900 dark:text-neutral-50">
              {transaction.amount ? `$${transaction.amount}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-neutral-500">Type</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              {transaction.type}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-neutral-500">Date</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              {new Date(transaction.date as string).toLocaleDateString()}
            </span>
          </div>
          {transaction.description && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-sm font-medium text-neutral-500 block mb-1">
                Description
              </span>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {transaction.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-emerald-500 text-sm text-center bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded">
              {success}
            </div>
          )}

          {witnessInvitation.status !== WitnessStatus.Pending ? (
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                You have already {witnessInvitation.status.toLowerCase()} this
                transaction.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => navigate({ to: "/" })}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : isExistingUser ? (
            /* Existing User Flow */
            isCurrentUserInvited ? (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleAcknowledge(WitnessStatus.Acknowledged)}
                  disabled={ackLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Acknowledge
                </Button>
                <Button
                  onClick={() => handleAcknowledge(WitnessStatus.Declined)}
                  disabled={ackLoading}
                  variant="destructive"
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  This invitation is for <strong>{invitedUser.email}</strong>.
                  {currentUser
                    ? " You are currently logged in as a different user."
                    : " Please log in to respond."}
                </p>
                <Button
                  onClick={() => navigate({ to: "/login" })}
                  variant="outline"
                  className="w-full"
                >
                  Log in as {invitedUser.email}
                </Button>
              </div>
            )
          ) : (
            /* New User Flow (Signup) */
            <form onSubmit={handleAcceptSignup} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={invitedUser.email}
                  disabled
                  className="mt-1 bg-neutral-100 dark:bg-neutral-800 opacity-70"
                />
              </div>
              <div>
                <Label htmlFor="password">Set Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Create a password to sign up"
                />
              </div>
              <Button type="submit" className="w-full">
                Accept & Create Account
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
