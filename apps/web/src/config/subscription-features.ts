import type { TierLimitsEntity } from "@/types/__generated__/graphql";

export interface FeatureEntry {
  key: string;
  tiers: ("FREE" | "PRO")[];
  /** True when this feature is enforced by a real code gate in the backend. */
  codeEnforced: boolean;
  label: string | ((limits: TierLimitsEntity) => string);
  highlightOnPro?: boolean;
}

export const TIER_DISPLAY: Record<"FREE" | "PRO", string> = {
  FREE: "Ledger",
  PRO: "Wathīqah Pro",
};

// Ordered as they should appear in pricing tier cards.
// ["FREE"] = Ledger-only (inherited by Pro, not repeated); ["PRO"] = Pro-only; ["FREE","PRO"] = shown on both (because the value differs per tier).
export const FEATURE_CATALOG: FeatureEntry[] = [
  // ── Always-on capabilities (no backend gate, available to all) ──────────
  // Listed on the Free card only — Pro inherits them, no need to repeat.
  {
    key: "unlimitedTransactions",
    tiers: ["FREE"],
    codeEnforced: false,
    label: "Unlimited Transactions",
  },
  {
    key: "unlimitedItems",
    tiers: ["FREE"],
    codeEnforced: false,
    label: "Unlimited Items",
  },
  {
    key: "emailNotifications",
    tiers: ["FREE"],
    codeEnforced: false,
    label: "Email Notifications",
  },
  // ── Limit-derived (label reflects live backend value) ──────────────────
  {
    key: "maxContacts",
    tiers: ["FREE", "PRO"],
    codeEnforced: true,
    label: (limits) =>
      limits.maxContacts === -1 ? "Unlimited Contacts" : `Up to ${limits.maxContacts} Contacts`,
  },
  {
    key: "maxWitnessesPerMonth",
    tiers: ["FREE", "PRO"],
    codeEnforced: true,
    label: (limits) =>
      limits.maxWitnessesPerMonth === -1
        ? "Unlimited Witness Requests"
        : `${limits.maxWitnessesPerMonth} Witness Requests / month`,
  },
  {
    key: "maxNotes",
    tiers: ["FREE", "PRO"],
    codeEnforced: true,
    label: (limits) =>
      limits.maxNotes === -1
        ? "Unlimited Personal Notes"
        : `Up to ${limits.maxNotes} Personal Notes`,
  },
  {
    key: "contactNotificationSms",
    tiers: ["FREE", "PRO"],
    codeEnforced: true,
    label: (limits) =>
      limits.contactNotificationSms === -1
        ? "Unlimited Contact Notification SMS"
        : `Contact Notification SMS (${limits.contactNotificationSms}/month)`,
    highlightOnPro: true,
  },
  // ── Boolean-gated features ─────────────────────────────────────────────
  {
    key: "allowAdvancedAnalytics",
    tiers: ["PRO"],
    codeEnforced: true,
    label: "Advanced Financial Analytics",
  },
  {
    key: "allowProfessionalReports",
    tiers: ["PRO"],
    codeEnforced: true,
    label: "Professional PDF Reports",
  },
  {
    key: "allowOrganisations",
    tiers: ["PRO"],
    codeEnforced: true,
    label: "Organisation Workspaces",
  },
  // ── Other tier-differentiated features ────────────────────────────────
  {
    key: "sharedAccessView",
    tiers: ["PRO"],
    codeEnforced: true,
    label: "View financial records shared with you by others",
  },
  // ── Always-on: legacy/shared access granting (free for all, not repeated on Pro) ──
  {
    key: "sharedAccessGrant",
    tiers: ["FREE"],
    codeEnforced: false,
    label: "Grant read-only access to trusted contacts (legacy access)",
  },
  // ── Policy commitment (Pro-only incentive) ────────────────────────────
  {
    key: "prioritySupport",
    tiers: ["PRO"],
    codeEnforced: false,
    label: "Priority Support",
  },
];

/**
 * Returns the list of features to display for a given tier.
 * Only includes features that tier actually has — nothing is listed as "unavailable."
 * Labels for limit-based entries reflect live backend values, so they never drift
 * from SUBSCRIPTION_LIMITS.
 */
export function getFeaturesForTier(
  tier: "FREE" | "PRO",
  limits: TierLimitsEntity,
): { label: string; highlight: boolean }[] {
  return FEATURE_CATALOG.filter((f) => f.tiers.includes(tier)).map((f) => ({
    label: typeof f.label === "function" ? f.label(limits) : f.label,
    highlight: (f.highlightOnPro ?? false) && tier === "PRO",
  }));
}
