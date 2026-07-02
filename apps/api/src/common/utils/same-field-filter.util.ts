interface FilterSubscriptionContext<ContextKey extends string> {
  req: { user?: Record<ContextKey, unknown> };
}

/**
 * Builds a GraphQL subscription `filter` that only delivers a payload to
 * subscribers whose `req.user[contextKey]` matches `payload[payloadKey]` —
 * e.g. scoping a subscription to the connected user's own id, or to the
 * org they were connected under.
 */
export function sameFieldFilter<
  PayloadKey extends string,
  ContextKey extends string,
>(payloadKey: PayloadKey, contextKey: ContextKey) {
  return (
    payload: Record<PayloadKey, unknown>,
    _variables: unknown,
    context: FilterSubscriptionContext<ContextKey>,
  ) => payload[payloadKey] === context.req.user?.[contextKey];
}
