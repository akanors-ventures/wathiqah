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
              {/* Lending */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Lending
                </p>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[10px] border border-blue-100 dark:border-blue-900/30 shrink-0">
                    LOAN GIVEN
                  </span>
                  <p>Money or item you lent out. Contact owes you.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded text-[10px] border border-rose-100 dark:border-rose-900/30 shrink-0">
                    LOAN RECEIVED
                  </span>
                  <p>Money or item you borrowed. You owe the contact.</p>
                </div>
              </div>

              {/* Repayments */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Repayments
                </p>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                    REPAYMENT MADE
                  </span>
                  <p>You repaid a debt to the contact. Reduces your outstanding balance.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                    REPAYMENT RECEIVED
                  </span>
                  <p>Contact repaid you. Reduces what they owe you.</p>
                </div>
              </div>

              {/* Gifts */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Gifts (no obligation)
                </p>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 px-1.5 py-0.5 rounded text-[10px] border border-pink-100 dark:border-pink-900/30 shrink-0">
                    GIFT GIVEN
                  </span>
                  <p>Gift you gave. No repayment expected.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded text-[10px] border border-purple-100 dark:border-purple-900/30 shrink-0">
                    GIFT RECEIVED
                  </span>
                  <p>Gift you received. No repayment obligation.</p>
                </div>
              </div>

              {/* Advances & Deposits */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Advances & Deposits
                </p>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] border border-orange-100 dark:border-orange-900/30 shrink-0">
                    ADVANCE PAID
                  </span>
                  <p>Advance you paid out. Contact owes goods or money.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded text-[10px] border border-purple-100 dark:border-purple-900/30 shrink-0">
                    ADVANCE RECEIVED
                  </span>
                  <p>Advance you received. You owe goods or service.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] border border-orange-100 dark:border-orange-900/30 shrink-0">
                    DEPOSIT PAID
                  </span>
                  <p>Deposit you paid. Contact owes it back.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded text-[10px] border border-purple-100 dark:border-purple-900/30 shrink-0">
                    DEPOSIT RECEIVED
                  </span>
                  <p>Deposit you received and hold. You owe it back.</p>
                </div>
              </div>

              {/* Custody */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Custody
                </p>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                    ESCROWED
                  </span>
                  <p>Cash you're holding in trust for the contact.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] border border-orange-100 dark:border-orange-900/30 shrink-0">
                    REMITTED
                  </span>
                  <p>Cash you disbursed on the contact's behalf.</p>
                </div>
              </div>

              {/* Legacy */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-1">
                <div>
                  <div className="font-medium text-red-600 dark:text-red-400 text-[10px] mb-0.5">
                    EXPENSE <span className="text-muted-foreground font-normal">(legacy)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Personal spending — read-only</p>
                </div>
                <div>
                  <div className="font-medium text-green-600 dark:text-green-400 text-[10px] mb-0.5">
                    INCOME <span className="text-muted-foreground font-normal">(legacy)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Personal earnings — read-only</p>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
