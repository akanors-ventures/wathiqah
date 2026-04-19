import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TYPE_GROUPS = [
  {
    label: "Lending",
    types: [
      {
        name: "LOAN GIVEN",
        color:
          "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30",
        desc: "Money or item you lent out. Contact owes you.",
      },
      {
        name: "LOAN RECEIVED",
        color:
          "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30",
        desc: "Money or item you borrowed. You owe the contact.",
      },
    ],
  },
  {
    label: "Repayments",
    types: [
      {
        name: "REPAYMENT MADE",
        color:
          "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30",
        desc: "You repaid a debt. Reduces your outstanding balance.",
      },
      {
        name: "REPAYMENT RECEIVED",
        color:
          "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30",
        desc: "Contact repaid you. Reduces what they owe you.",
      },
    ],
  },
  {
    label: "Gifts (no obligation)",
    types: [
      {
        name: "GIFT GIVEN",
        color:
          "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-900/30",
        desc: "Gift you gave. No repayment expected.",
      },
      {
        name: "GIFT RECEIVED",
        color:
          "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30",
        desc: "Gift you received. No repayment obligation.",
      },
    ],
  },
  {
    label: "Advances & Deposits",
    types: [
      {
        name: "ADVANCE PAID",
        color:
          "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30",
        desc: "Advance you paid out. Contact owes goods or money.",
      },
      {
        name: "ADVANCE RECEIVED",
        color:
          "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30",
        desc: "Advance you received. You owe goods or service.",
      },
      {
        name: "DEPOSIT PAID",
        color:
          "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30",
        desc: "Deposit you paid. Contact owes it back.",
      },
      {
        name: "DEPOSIT RECEIVED",
        color:
          "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30",
        desc: "Deposit you received and hold. You owe it back.",
      },
    ],
  },
  {
    label: "Custody",
    types: [
      {
        name: "ESCROWED",
        color:
          "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30",
        desc: "Cash you're holding in trust for the contact.",
      },
      {
        name: "REMITTED",
        color:
          "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30",
        desc: "Cash you disbursed on the contact's behalf.",
      },
    ],
  },
];

export function TransactionTypeHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
        aria-label="Transaction types guide"
      >
        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Transaction Types</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {TYPE_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.types.map((t) => (
                    <div key={t.name} className="flex items-start gap-2.5">
                      <span
                        className={`font-medium px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${t.color}`}
                      >
                        {t.name}
                      </span>
                      <p className="text-muted-foreground leading-relaxed pt-px">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t pt-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Legacy (read-only)
              </p>
              <div className="flex gap-4">
                <div>
                  <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                    EXPENSE
                  </span>
                  <p className="text-[10px] text-muted-foreground">Personal spending</p>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    INCOME
                  </span>
                  <p className="text-[10px] text-muted-foreground">Personal earnings</p>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
