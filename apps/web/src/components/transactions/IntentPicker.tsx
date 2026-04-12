import { ArrowDownLeft, ArrowUpRight, Gift, HandCoins, PiggyBank, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/types/__generated__/graphql";

/* -------------------------------------------------------------------------- */
/*  Intent → type mapping                                                     */
/* -------------------------------------------------------------------------- */

type Intent = "LENDING" | "GIFTING" | "ADVANCE_DEPOSIT" | "CUSTODY";

interface IntentCard {
  intent: Intent;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon background and accent colour. */
  accent: string;
}

const INTENT_CARDS: IntentCard[] = [
  {
    intent: "LENDING",
    label: "Lending",
    description: "Money lent or borrowed, expected back",
    Icon: HandCoins,
    accent: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  },
  {
    intent: "GIFTING",
    label: "Gifting",
    description: "One-way transfer, nothing expected back",
    Icon: Gift,
    accent: "text-pink-600 bg-pink-500/10 border-pink-500/20",
  },
  {
    intent: "ADVANCE_DEPOSIT",
    label: "Advance / Deposit",
    description: "Up-front payment for goods, services, or security",
    Icon: PiggyBank,
    accent: "text-orange-600 bg-orange-500/10 border-orange-500/20",
  },
  {
    intent: "CUSTODY",
    label: "Custody",
    description: "Holding or releasing money on someone else's behalf",
    Icon: ShieldCheck,
    accent: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
];

interface DirectionOption {
  value: TransactionType;
  label: string;
  helper: string;
  /** "out" = leaving you, "in" = coming to you */
  flow: "out" | "in";
}

const DIRECTIONS: Record<Intent, DirectionOption[]> = {
  LENDING: [
    {
      value: TransactionType.LoanGiven,
      label: "I'm lending",
      helper: "Money goes out, contact owes me",
      flow: "out",
    },
    {
      value: TransactionType.LoanReceived,
      label: "I'm borrowing",
      helper: "Money comes in, I owe contact",
      flow: "in",
    },
  ],
  GIFTING: [
    {
      value: TransactionType.GiftGiven,
      label: "I'm giving",
      helper: "I sent a gift to my contact",
      flow: "out",
    },
    {
      value: TransactionType.GiftReceived,
      label: "I'm receiving",
      helper: "I received a gift from my contact",
      flow: "in",
    },
  ],
  ADVANCE_DEPOSIT: [
    {
      value: TransactionType.AdvancePaid,
      label: "Advance paid",
      helper: "I paid in advance — contact owes me goods/work",
      flow: "out",
    },
    {
      value: TransactionType.AdvanceReceived,
      label: "Advance received",
      helper: "Contact paid me in advance — I owe goods/work",
      flow: "in",
    },
    {
      value: TransactionType.DepositPaid,
      label: "Deposit paid",
      helper: "I left a deposit with my contact — refundable",
      flow: "out",
    },
    {
      value: TransactionType.DepositReceived,
      label: "Deposit received",
      helper: "I'm holding a deposit for my contact — refundable",
      flow: "in",
    },
  ],
  CUSTODY: [
    {
      value: TransactionType.Escrowed,
      label: "Holding (escrow)",
      helper: "I'm holding cash that needs to be disbursed",
      flow: "in",
    },
  ],
};

/** Reverse lookup: given a type, which intent does it belong to? */
const TYPE_TO_INTENT: Partial<Record<TransactionType, Intent>> = {
  [TransactionType.LoanGiven]: "LENDING",
  [TransactionType.LoanReceived]: "LENDING",
  [TransactionType.GiftGiven]: "GIFTING",
  [TransactionType.GiftReceived]: "GIFTING",
  [TransactionType.AdvancePaid]: "ADVANCE_DEPOSIT",
  [TransactionType.AdvanceReceived]: "ADVANCE_DEPOSIT",
  [TransactionType.DepositPaid]: "ADVANCE_DEPOSIT",
  [TransactionType.DepositReceived]: "ADVANCE_DEPOSIT",
  [TransactionType.Escrowed]: "CUSTODY",
  [TransactionType.Remitted]: "CUSTODY",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface IntentPickerProps {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
}

export function IntentPicker({ value, onChange }: IntentPickerProps) {
  // Track which intent the user is browsing. Defaults to whatever the current
  // value belongs to (so editing an existing draft lands on the right tile).
  const [intent, setIntent] = useState<Intent>(() => TYPE_TO_INTENT[value] ?? "LENDING");

  // Keep intent in sync if the form value is changed externally (e.g. another
  // control on the page sets a different type). IMPORTANT: only listen to
  // `value` changes — including `intent` here would clobber the user's local
  // intent click before they pick a direction.
  useEffect(() => {
    const next = TYPE_TO_INTENT[value];
    if (next) setIntent(next);
  }, [value]);

  const directions = DIRECTIONS[intent];

  return (
    <div className="space-y-4">
      {/* Step 1 — Intent grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          1. What kind of transaction is this?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {INTENT_CARDS.map((card) => {
            const isActive = intent === card.intent;
            const Icon = card.Icon;
            return (
              <button
                key={card.intent}
                type="button"
                onClick={() => setIntent(card.intent)}
                className={cn(
                  "group flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
                  isActive
                    ? `${card.accent} ring-2 ring-offset-1 ring-offset-background`
                    : "border-border/50 bg-card hover:border-border hover:bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border",
                    isActive ? card.accent : "bg-muted/50 text-muted-foreground border-border/50",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground leading-tight">
                    {card.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {card.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — Direction */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">2. Which direction?</p>
        <div
          className={cn(
            "grid gap-2",
            directions.length > 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
          )}
        >
          {directions.map((opt) => {
            const isActive = value === opt.value;
            const FlowIcon = opt.flow === "out" ? ArrowUpRight : ArrowDownLeft;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                    : "border-border/50 bg-card hover:border-border hover:bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border",
                    opt.flow === "out"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                  )}
                >
                  <FlowIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground leading-tight">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {opt.helper}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
