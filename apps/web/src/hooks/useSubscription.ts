import { useQuery } from "@apollo/client/react";
import { MY_SUBSCRIPTION_QUERY } from "../lib/apollo/queries/subscription";
import type { MySubscriptionQuery } from "../types/__generated__/graphql";
import { useAuth } from "./use-auth";

export function useSubscription() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useQuery<MySubscriptionQuery>(MY_SUBSCRIPTION_QUERY, {
    skip: !user,
  });

  const subscription = data?.mySubscription;
  const limits = subscription?.limits;
  const tier = subscription?.tier;
  const featureUsage = subscription?.featureUsage as Record<string, number> | undefined;

  const getWitnessUsage = () => {
    if (!featureUsage) return 0;
    const now = new Date();
    const monthKey = `maxWitnessesPerMonth_${now.getFullYear()}_${now.getMonth() + 1}`;
    return featureUsage[monthKey] || 0;
  };

  const witnessUsage = getWitnessUsage();

  return {
    subscription,
    limits,
    tier,
    featureUsage,
    loading,
    error,
    refetch,
    isPro: tier === "PRO",
    allowSMS: limits?.allowSMS ?? false,
    allowAdvancedAnalytics: limits?.allowAdvancedAnalytics ?? false,
    allowProfessionalReports: limits?.allowProfessionalReports ?? false,
    maxContacts: limits?.maxContacts ?? 0,
    maxWitnessesPerMonth: limits?.maxWitnessesPerMonth ?? 0,
    witnessUsage,
    witnessRemaining: Math.max(0, (limits?.maxWitnessesPerMonth ?? 0) - witnessUsage),
  };
}
