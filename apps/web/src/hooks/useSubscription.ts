import { useQuery } from "@apollo/client/react";
import { MY_SUBSCRIPTION_QUERY } from "../lib/apollo/queries/subscription";
import { useAuth } from "./use-auth";

export function useSubscription() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useQuery(MY_SUBSCRIPTION_QUERY, {
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

  const getSmsUsage = () => {
    if (!featureUsage) return 0;
    const now = new Date();
    const monthKey = `contactNotificationSms_${now.getFullYear()}_${now.getMonth() + 1}`;
    return featureUsage[monthKey] || 0;
  };

  const smsUsage = getSmsUsage();

  const rawMaxContacts = limits?.maxContacts ?? 0;
  const rawMaxWitnessesPerMonth = limits?.maxWitnessesPerMonth ?? 0;

  const maxContacts = rawMaxContacts === -1 ? Infinity : rawMaxContacts;
  const maxWitnessesPerMonth = rawMaxWitnessesPerMonth === -1 ? Infinity : rawMaxWitnessesPerMonth;
  const witnessRemaining =
    maxWitnessesPerMonth === Infinity ? Infinity : Math.max(0, maxWitnessesPerMonth - witnessUsage);

  const rawMaxSmsPerMonth = limits?.contactNotificationSms ?? 0;
  const maxSmsPerMonth = rawMaxSmsPerMonth === -1 ? Infinity : rawMaxSmsPerMonth;
  const smsRemaining =
    maxSmsPerMonth === Infinity ? Infinity : Math.max(0, maxSmsPerMonth - smsUsage);

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
    maxContacts,
    maxWitnessesPerMonth,
    witnessUsage,
    witnessRemaining,
    smsUsage,
    maxSmsPerMonth,
    smsRemaining,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null,
  };
}
