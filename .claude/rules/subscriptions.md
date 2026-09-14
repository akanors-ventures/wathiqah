# Subscription Tier & Feature Limit Patterns

Loads when adding a feature gate, checking a tier, or wiring a usage counter. See `apps/api/src/modules/subscription/subscription.service.ts`.

## Subscription Tier Check Pattern

**For checking the authenticated caller's features**: use `@CheckFeature('featureName')` decorator on the resolver method. This is the standard path.

**For checking a _different_ user's tier** (e.g. checking the granter's or viewer's subscription in shared-access scenarios): do NOT use `@CheckFeature`. Instead, look up that user inline in the service method:

```ts
const user = await this.prisma.user.findUnique({
  where: { id: userId }, // or { email }
  select: { tier: true },
});
if (!user || user.tier !== SubscriptionTier.PRO) {
  throw new ForbiddenException("...");
}
```

`@CheckFeature` always operates on the authenticated caller — using it for cross-user tier checks is wrong.

## Subscription Feature Limit Patterns

Two check patterns exist in `SubscriptionService.checkFeatureLimit`:

- **DB-count** (`maxContacts`, `maxNotes`): counts actual Prisma rows. `incrementFeatureUsage` skips these (no counter). Add a special-case block in `checkFeatureLimit` to implement a new one.
- **Monthly counter** (`maxWitnessesPerMonth`, `contactNotificationSms`): tracked in `featureUsage` JSON with key `${feature}_${year}_${month}`. `incrementFeatureUsage` bumps these automatically. New monthly-counter features work without any special-casing.
