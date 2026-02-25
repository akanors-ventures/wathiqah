import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, UserPlus, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  hasContacts: boolean;
  hasTransactions: boolean;
  hasInvitedWitness: boolean;
}

export function OnboardingChecklist({
  hasContacts,
  hasTransactions,
  hasInvitedWitness,
}: OnboardingChecklistProps) {
  const steps = [
    {
      id: "contact",
      title: "Add your first contact",
      description: "People you lend to or borrow from.",
      completed: hasContacts,
      icon: <UserPlus className="w-5 h-5" />,
      action: { label: "Add Contact", to: "/contacts" },
    },
    {
      id: "transaction",
      title: "Record a transaction",
      description: "Document a loan, debt, or item.",
      completed: hasTransactions,
      icon: <Wallet className="w-5 h-5" />,
      action: { label: "New Transaction", to: "/transactions/new" },
    },
    {
      id: "witness",
      title: "Invite a witness",
      description: "Add a third-party to verify a record.",
      completed: hasInvitedWitness,
      icon: <Users className="w-5 h-5" />,
      action: { label: "Learn about Witnesses", to: "/witnesses" },
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-bold">Getting Started</CardTitle>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Complete these steps to set up your ledger.
            </p>
          </div>
          <div className="text-xs font-bold bg-background px-3 py-1 rounded-full border border-border shadow-sm">
            {completedCount}/{steps.length} Completed
          </div>
        </div>
        <div className="h-1 w-full bg-background/50 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
              step.completed
                ? "bg-background/40 border-border/40 opacity-70"
                : "bg-background border-border shadow-sm hover:border-primary/30",
            )}
          >
            <div
              className={cn(
                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                step.completed ? "text-primary" : "text-muted-foreground bg-muted",
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4
                className={cn(
                  "font-bold text-sm",
                  step.completed
                    ? "text-muted-foreground line-through decoration-primary/30"
                    : "text-foreground",
                )}
              >
                {step.title}
              </h4>
              <p className="text-xs text-muted-foreground truncate">{step.description}</p>
            </div>
            {!step.completed && (
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold" asChild>
                <Link to={step.action.to}>{step.action.label}</Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
