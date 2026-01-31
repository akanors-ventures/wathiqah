import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function TransactionTypeHelp() {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
          >
            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
            <span className="sr-only">Transaction types guide</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4" side="bottom" align="start">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-2">Transaction Types Guide</h4>
            <div className="grid gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[10px] border border-blue-100 dark:border-blue-900/30">
                    GIVEN
                  </span>
                  <span className="text-[10px] font-bold text-blue-600/80 uppercase tracking-tight">
                    Asset / Credit
                  </span>
                </div>
                <p>
                  Assets provided to a contact (e.g., lending money). Decreases your immediate
                  balance but increases what is owed to you.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-[10px] border border-red-100 dark:border-red-900/30">
                    RECEIVED
                  </span>
                  <span className="text-[10px] font-bold text-red-600/80 uppercase tracking-tight">
                    Liability / Debt
                  </span>
                </div>
                <p>
                  Assets obtained from a contact (e.g., borrowing). Increases your immediate balance
                  but creates an obligation to repay.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100 dark:border-emerald-900/30">
                    RETURNED
                  </span>
                </div>
                <p>Repayments or assets returned between you and a contact.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded text-[10px] border border-purple-100 dark:border-purple-900/30">
                    GIFT
                  </span>
                </div>
                <p>Assets given or received as a gift (does not affect net balance).</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-1">
                <div>
                  <div className="font-medium text-red-600 dark:text-red-400 text-[10px] mb-0.5">
                    EXPENSE
                  </div>
                  <p className="text-[10px] text-muted-foreground">Personal spending (Outflow)</p>
                </div>
                <div>
                  <div className="font-medium text-green-600 dark:text-green-400 text-[10px] mb-0.5">
                    INCOME
                  </div>
                  <p className="text-[10px] text-muted-foreground">Personal earnings (Inflow)</p>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
