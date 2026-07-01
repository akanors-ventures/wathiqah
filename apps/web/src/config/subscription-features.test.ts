import { describe, expect, it } from "vitest";
import type { TierLimitsEntity } from "@/types/__generated__/graphql";
import { FEATURE_CATALOG, getFeaturesForTier, TIER_DISPLAY } from "./subscription-features";

const FREE_LIMITS: TierLimitsEntity = {
  __typename: "TierLimitsEntity",
  maxContacts: 20,
  maxWitnessesPerMonth: 5,
  contactNotificationSms: 10,
  allowSMS: false,
  allowAdvancedAnalytics: false,
  allowProfessionalReports: false,
  allowOrganisations: false,
  maxNotes: 5,
};

const PRO_LIMITS: TierLimitsEntity = {
  __typename: "TierLimitsEntity",
  maxContacts: -1,
  maxWitnessesPerMonth: -1,
  contactNotificationSms: -1,
  allowSMS: true,
  allowAdvancedAnalytics: true,
  allowProfessionalReports: true,
  allowOrganisations: true,
  maxNotes: -1,
};

describe("getFeaturesForTier", () => {
  describe("FREE tier", () => {
    it("returns only features available on FREE", () => {
      const features = getFeaturesForTier("FREE", FREE_LIMITS);
      const labels = features.map((f) => f.label);
      // Pro-only entries must not appear
      expect(labels).not.toContain("Advanced Financial Analytics");
      expect(labels).not.toContain("Professional PDF Reports");
      expect(labels).not.toContain("Organisation Workspaces");
      expect(labels).not.toContain("View financial records shared with you by others");
    });

    it("includes always-on features on FREE", () => {
      const labels = getFeaturesForTier("FREE", FREE_LIMITS).map((f) => f.label);
      expect(labels).toContain("Unlimited Transactions");
      expect(labels).toContain("Unlimited Items");
      expect(labels).toContain("Email Notifications");
      expect(labels).toContain("Grant read-only access to trusted contacts (legacy access)");
    });

    it("does not show Priority Support on FREE (it is a Pro incentive)", () => {
      const labels = getFeaturesForTier("FREE", FREE_LIMITS).map((f) => f.label);
      expect(labels).not.toContain("Priority Support");
    });

    it("renders limit-derived label with finite maxNotes (5)", () => {
      const labels = getFeaturesForTier("FREE", FREE_LIMITS).map((f) => f.label);
      expect(labels).toContain("Up to 5 Personal Notes");
    });

    it("renders limit-derived label with finite maxWitnessesPerMonth (5)", () => {
      const labels = getFeaturesForTier("FREE", FREE_LIMITS).map((f) => f.label);
      expect(labels).toContain("5 Witness Requests / month");
    });

    it("renders limit-derived label with finite contactNotificationSms (10)", () => {
      const labels = getFeaturesForTier("FREE", FREE_LIMITS).map((f) => f.label);
      expect(labels).toContain("Contact Notification SMS (10/month)");
    });

    it("does not highlight any feature on FREE", () => {
      const highlights = getFeaturesForTier("FREE", FREE_LIMITS).map((f) => f.highlight);
      expect(highlights.every((h) => h === false)).toBe(true);
    });
  });

  describe("PRO tier", () => {
    it("includes all FEATURE_CATALOG entries for PRO", () => {
      const proKeys = FEATURE_CATALOG.filter((e) => e.tiers.includes("PRO")).map((e) => e.key);
      const result = getFeaturesForTier("PRO", PRO_LIMITS);
      expect(result).toHaveLength(proKeys.length);
    });

    it("renders 'Unlimited' labels when limit is -1", () => {
      const labels = getFeaturesForTier("PRO", PRO_LIMITS).map((f) => f.label);
      expect(labels).toContain("Unlimited Contacts");
      expect(labels).toContain("Unlimited Witness Requests");
      expect(labels).toContain("Unlimited Personal Notes");
      expect(labels).toContain("Unlimited Contact Notification SMS");
    });

    it("highlights contactNotificationSms on PRO", () => {
      const features = getFeaturesForTier("PRO", PRO_LIMITS);
      const smsFeature = features.find((f) => f.label === "Unlimited Contact Notification SMS");
      expect(smsFeature?.highlight).toBe(true);
    });

    it("includes Pro-only features", () => {
      const labels = getFeaturesForTier("PRO", PRO_LIMITS).map((f) => f.label);
      expect(labels).toContain("Advanced Financial Analytics");
      expect(labels).toContain("Professional PDF Reports");
      expect(labels).toContain("Organisation Workspaces");
      expect(labels).toContain("View financial records shared with you by others");
      expect(labels).toContain("Priority Support");
    });

    it("does not repeat Free-only base features on PRO", () => {
      const labels = getFeaturesForTier("PRO", PRO_LIMITS).map((f) => f.label);
      expect(labels).not.toContain("Unlimited Transactions");
      expect(labels).not.toContain("Unlimited Items");
      expect(labels).not.toContain("Email Notifications");
      expect(labels).not.toContain("Grant read-only access to trusted contacts (legacy access)");
    });

    it("does not include Exclusive Supporter Badge", () => {
      const labels = getFeaturesForTier("PRO", PRO_LIMITS).map((f) => f.label);
      const hasSupporter = labels.some((l) => l.toLowerCase().includes("supporter"));
      expect(hasSupporter).toBe(false);
    });
  });
});

describe("TIER_DISPLAY", () => {
  it("maps FREE to Ledger", () => {
    expect(TIER_DISPLAY.FREE).toBe("Ledger");
  });

  it("maps PRO to Wathīqah Pro", () => {
    expect(TIER_DISPLAY.PRO).toBe("Wathīqah Pro");
  });
});
