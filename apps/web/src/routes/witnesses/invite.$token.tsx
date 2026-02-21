import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/use-auth";
import { useAcknowledgeWitness, useWitnessInvitation } from "@/hooks/useWitnesses";
import {
  AssetCategory,
  ReturnDirection,
  TransactionType,
  WitnessStatus,
} from "@/types/__generated__/graphql";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { SupporterBadge } from "@/components/ui/supporter-badge";

export const Route = createFileRoute("/witnesses/invite/$token")({
  component: InviteComponent,
});

function InviteComponent() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user: currentUser, acceptInvitation } = useAuth();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { invitation: witnessInvitation, loading, error: queryError } = useWitnessInvitation(token);

  const { acknowledge, loading: ackLoading } = useAcknowledgeWitness();

  const id = useId();

  if (loading) {
    return <PageLoader />;
  }

  if (queryError || !witnessInvitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center max-w-md p-6 bg-white dark:bg-neutral-900 rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-500 mb-2">Invitation Error</h2>
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

  if (!transaction || !invitedUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center max-w-md p-6 bg-white dark:bg-neutral-900 rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-500 mb-2">Data Error</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Could not retrieve transaction or user details.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isExistingUser = !!invitedUser.passwordHash;
  const isCurrentUserInvited = currentUser?.email === invitedUser.email;

  const handleAcceptSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await acceptInvitation({ token, password });
      toast.success("Account created successfully!");
      navigate({ to: "/witnesses/next-action" });
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to create account");
      } else {
        toast.error("Failed to create account");
      }
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (status: WitnessStatus) => {
    try {
      // Use token instead of witness ID for more reliability from email
      await acknowledge({ token }, status);
      toast.success(`Transaction ${status.toLowerCase()} successfully!`);
      navigate({ to: "/" });
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || `Failed to ${status.toLowerCase()} transaction`);
      } else {
        toast.error(`Failed to ${status.toLowerCase()} transaction`);
      }
    }
  };

  const getTypeStyles = () => {
    const type = transaction.type;
    const returnDirection = transaction.returnDirection;

    switch (type) {
      case TransactionType.Received:
        return "text-red-600 border-red-200 bg-red-50";
      case TransactionType.Given:
        return "text-blue-600 border-blue-200 bg-blue-50";
      case TransactionType.Gift:
        return returnDirection === ReturnDirection.ToMe
          ? "text-purple-600 border-purple-200 bg-purple-50"
          : "text-pink-600 border-pink-200 bg-pink-50";
      case TransactionType.Returned:
        return returnDirection === ReturnDirection.ToMe
          ? "text-emerald-600 border-emerald-200 bg-emerald-50"
          : "text-blue-600 border-blue-200 bg-blue-50";
      default:
        return "text-neutral-600 border-neutral-200 bg-neutral-50";
    }
  };

  const getTypeLabel = () => {
    const type = transaction.type;
    const returnDirection = transaction.returnDirection;

    if (type === TransactionType.Gift) {
      return returnDirection === ReturnDirection.ToMe ? "Gift Received" : "Gift Given";
    }
    if (type === TransactionType.Returned) {
      return returnDirection === ReturnDirection.ToMe ? "Returned to Me" : "Returned to Contact";
    }
    return type;
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-lg space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Witness Invitation
          </h2>
          <div className="mt-2 text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center justify-center gap-x-1">
            <div className="flex items-center gap-1">
              <strong>{transaction.createdBy?.name}</strong>
              {transaction.createdBy?.isSupporter && (
                <SupporterBadge className="h-4 px-1 text-[9px]" />
              )}
            </div>
            <span>has invited you to witness a transaction between them and</span>
            <div className="flex items-center gap-1">
              <strong>{transaction.contact?.name || "N/A"}</strong>
              {transaction.contact?.isSupporter && (
                <SupporterBadge className="h-4 px-1 text-[9px]" />
              )}
            </div>
            <span>.</span>
          </div>
        </div>

        {/* Transaction Details Card */}
        <div className="bg-neutral-100 dark:bg-neutral-800 p-6 rounded-md space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-neutral-500">
              {transaction.category === AssetCategory.Item ? "Quantity" : "Amount"}
            </span>
            <span className="font-bold text-lg text-neutral-900 dark:text-neutral-50">
              {transaction.amount
                ? transaction.category === AssetCategory.Item
                  ? `${transaction.amount} ${transaction.itemName || "items"}`
                  : formatCurrency(transaction.amount, transaction.currency)
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-neutral-500">Type</span>
            <Badge variant="outline" className={getTypeStyles()}>
              {getTypeLabel()}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-neutral-500">Date</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              {formatDate(transaction.date)}
            </span>
          </div>
          {transaction.description && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-sm font-medium text-neutral-500 block mb-1">Description</span>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {transaction.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="space-y-4">
          {witnessInvitation.status !== WitnessStatus.Pending ? (
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                You have already {witnessInvitation.status.toLowerCase()} this transaction.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => navigate({ to: "/", search: {} })}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : isExistingUser ? (
            /* Existing User Flow */
            isCurrentUserInvited ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleAcknowledge(WitnessStatus.Acknowledged)}
                  isLoading={ackLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                >
                  Acknowledge
                </Button>
                <Button
                  onClick={() => handleAcknowledge(WitnessStatus.Declined)}
                  isLoading={ackLoading}
                  variant="destructive"
                  className="w-full"
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
                  onClick={() =>
                    navigate({
                      to: "/login",
                      search: { redirectTo: "/witnesses/next-action" },
                    })
                  }
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
                <Label htmlFor={`${id}-email`}>Email</Label>
                <Input
                  id={`${id}-email`}
                  value={invitedUser.email}
                  disabled
                  className="mt-1 bg-neutral-100 dark:bg-neutral-800 opacity-70"
                />
              </div>
              <div>
                <Label htmlFor={`${id}-password`}>Set Password</Label>
                <PasswordInput
                  id={`${id}-password`}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Create a password to sign up"
                />
              </div>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Accept & Create Account
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
