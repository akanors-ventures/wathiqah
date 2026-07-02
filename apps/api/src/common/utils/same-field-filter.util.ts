interface FilterSubscriptionContext<ContextKey extends string> {
  req: { user?: Record<ContextKey, unknown> };
}

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
