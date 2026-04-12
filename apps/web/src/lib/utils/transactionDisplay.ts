/**
 * Single source of truth for how transaction types are rendered in the UI:
 *   - cash-flow direction (incoming vs outgoing → arrow + sign)
 *   - color theme (semantic category)
 *
 * Every transaction-related component should import from here instead of
 * duplicating its own color/sign ladder.
 */

/**
 * All transaction types accepted by the UI layer. Includes legacy EXPENSE/INCOME
 * so that older rows still render without falling through to the default case.
 */
export type DisplayTransactionType =
  | "LOAN_GIVEN"
  | "LOAN_RECEIVED"
  | "REPAYMENT_MADE"
  | "REPAYMENT_RECEIVED"
  | "GIFT_GIVEN"
  | "GIFT_RECEIVED"
  | "ADVANCE_PAID"
  | "ADVANCE_RECEIVED"
  | "DEPOSIT_PAID"
  | "DEPOSIT_RECEIVED"
  | "ESCROWED"
  | "REMITTED"
  | "EXPENSE"
  | "INCOME"
  | (string & {});

export interface TransactionTheme {
  /** Whether money came IN from the user's perspective (arrow up, "+"). */
  isIncoming: boolean;
  /** "+" or "-" to prefix amounts. */
  sign: "+" | "-";
  /** Hue name, used by a few places that want to build class names manually. */
  hue: "blue" | "rose" | "emerald" | "orange" | "purple" | "pink" | "teal" | "slate";
  /** `text-*-600 dark:text-*-400` — for amount text and badge labels. */
  textClass: string;
  /** `text-*-500` (no dark override) — for icons. */
  iconClass: string;
  /** Solid background class at a faint opacity. */
  bgClass: string;
  /** Border class to pair with bgClass for badges. */
  borderClass: string;
  /** Tailwind gradient stops (without `bg-gradient-*` direction prefix). */
  gradient: string;
  /** `text-{hue}-600 border-{hue}-200 bg-{hue}-50` composite used by table badges. */
  badgeClass: string;
}

const THEMES: Record<string, TransactionTheme> = {
  LOAN_GIVEN: {
    isIncoming: false,
    sign: "-",
    hue: "blue",
    textClass: "text-blue-600 dark:text-blue-400",
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
    gradient: "from-blue-500 via-blue-500/80 to-blue-500/60",
    badgeClass: "text-blue-600 border-blue-200 bg-blue-50",
  },
  LOAN_RECEIVED: {
    isIncoming: true,
    sign: "+",
    hue: "rose",
    textClass: "text-rose-600 dark:text-rose-400",
    iconClass: "text-rose-500",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    gradient: "from-rose-500 via-rose-500/80 to-rose-500/60",
    badgeClass: "text-rose-600 border-rose-200 bg-rose-50",
  },
  REPAYMENT_MADE: {
    // I paid off a debt — cash out, but debt-clearing (green).
    isIncoming: false,
    sign: "-",
    hue: "emerald",
    textClass: "text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    gradient: "from-emerald-500 via-emerald-500/80 to-emerald-500/60",
    badgeClass: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  REPAYMENT_RECEIVED: {
    // Contact paid me back — cash in, debt-clearing (green).
    isIncoming: true,
    sign: "+",
    hue: "emerald",
    textClass: "text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    gradient: "from-emerald-500 via-emerald-500/80 to-emerald-500/60",
    badgeClass: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  GIFT_GIVEN: {
    isIncoming: false,
    sign: "-",
    hue: "pink",
    textClass: "text-pink-600 dark:text-pink-400",
    iconClass: "text-pink-500",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20",
    gradient: "from-pink-500 via-pink-500/80 to-pink-500/60",
    badgeClass: "text-pink-600 border-pink-200 bg-pink-50",
  },
  GIFT_RECEIVED: {
    isIncoming: true,
    sign: "+",
    hue: "purple",
    textClass: "text-purple-600 dark:text-purple-400",
    iconClass: "text-purple-500",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20",
    gradient: "from-purple-500 via-purple-500/80 to-purple-500/60",
    badgeClass: "text-purple-600 border-purple-200 bg-purple-50",
  },
  ADVANCE_PAID: {
    isIncoming: false,
    sign: "-",
    hue: "orange",
    textClass: "text-orange-600 dark:text-orange-400",
    iconClass: "text-orange-500",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
    gradient: "from-orange-500 via-orange-500/80 to-orange-500/60",
    badgeClass: "text-orange-600 border-orange-200 bg-orange-50",
  },
  ADVANCE_RECEIVED: {
    isIncoming: true,
    sign: "+",
    hue: "purple",
    textClass: "text-purple-600 dark:text-purple-400",
    iconClass: "text-purple-500",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20",
    gradient: "from-purple-500 via-purple-500/80 to-purple-500/60",
    badgeClass: "text-purple-600 border-purple-200 bg-purple-50",
  },
  DEPOSIT_PAID: {
    isIncoming: false,
    sign: "-",
    hue: "orange",
    textClass: "text-orange-600 dark:text-orange-400",
    iconClass: "text-orange-500",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
    gradient: "from-orange-500 via-orange-500/80 to-orange-500/60",
    badgeClass: "text-orange-600 border-orange-200 bg-orange-50",
  },
  DEPOSIT_RECEIVED: {
    isIncoming: true,
    sign: "+",
    hue: "purple",
    textClass: "text-purple-600 dark:text-purple-400",
    iconClass: "text-purple-500",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20",
    gradient: "from-purple-500 via-purple-500/80 to-purple-500/60",
    badgeClass: "text-purple-600 border-purple-200 bg-purple-50",
  },
  ESCROWED: {
    isIncoming: true,
    sign: "+",
    hue: "teal",
    textClass: "text-teal-600 dark:text-teal-400",
    iconClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/20",
    gradient: "from-teal-500 via-teal-500/80 to-teal-500/60",
    badgeClass: "text-teal-600 border-teal-200 bg-teal-50",
  },
  REMITTED: {
    isIncoming: false,
    sign: "-",
    hue: "orange",
    textClass: "text-orange-600 dark:text-orange-400",
    iconClass: "text-orange-500",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
    gradient: "from-orange-500 via-orange-500/80 to-orange-500/60",
    badgeClass: "text-orange-600 border-orange-200 bg-orange-50",
  },
  // Legacy personal types — kept so existing rows render without the default slate fallback.
  INCOME: {
    isIncoming: true,
    sign: "+",
    hue: "emerald",
    textClass: "text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    gradient: "from-emerald-500 via-emerald-500/80 to-emerald-500/60",
    badgeClass: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  EXPENSE: {
    isIncoming: false,
    sign: "-",
    hue: "rose",
    textClass: "text-rose-600 dark:text-rose-400",
    iconClass: "text-rose-500",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    gradient: "from-rose-500 via-rose-500/80 to-rose-500/60",
    badgeClass: "text-rose-600 border-rose-200 bg-rose-50",
  },
};

const FALLBACK: TransactionTheme = {
  isIncoming: false,
  sign: "-",
  hue: "slate",
  textClass: "text-slate-600 dark:text-slate-400",
  iconClass: "text-slate-500",
  bgClass: "bg-slate-500/10",
  borderClass: "border-slate-500/20",
  gradient: "from-slate-500 via-slate-500/80 to-slate-500/60",
  badgeClass: "text-slate-600 border-slate-200 bg-slate-50",
};

/** Returns the display theme for a transaction type. Unknown types fall back to slate. */
export function getTransactionTheme(type: DisplayTransactionType): TransactionTheme {
  return THEMES[type] ?? FALLBACK;
}

/** Format a type constant as a human-readable label ("LOAN_GIVEN" → "Loan given"). */
export function formatTransactionTypeLabel(type: string): string {
  const lower = type.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
