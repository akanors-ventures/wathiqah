import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, ArrowRight, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/witnesses/next-action")({
  component: NextActionComponent,
});

function NextActionComponent() {
  return (
    <div className="flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4 min-h-[80vh]">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 animate-bounce-slow">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
            Account Verified!
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-md mx-auto font-medium">
            You're almost there. One final step is required to complete your witness request.
          </p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-[32px] overflow-hidden bg-white dark:bg-neutral-900">
          <CardHeader className="pb-2 p-8">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-primary" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8">
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-50">
                    Review the Transaction
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    You'll see the full details of the transaction including the amount, date, and
                    participants.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-50">
                    Acknowledge or Decline
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    If everything looks correct, click "Acknowledge". If you don't recognize the
                    transaction or the details are wrong, click "Decline".
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-50">Secure Record</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Once acknowledged, your verification becomes a permanent part of the
                    transaction's audit trail.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <Button
                asChild
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Link to="/witnesses">
                  Process Your Witness Confirmation
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-neutral-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Your information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
