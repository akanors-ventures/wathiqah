# Linked Transactions — Feature Idea

**Status:** Idea — not yet designed or scoped
**Captured:** 2026-04-03
**Origin:** Triangular transaction scenario (A asks me to send money to B on their behalf)

---

## The Problem

Wathiqah transactions are bilateral — one creator, one contact. But real-world financial flows are often triangular:

- Musa asks me to send ₦50k to Ali → two separate transactions (COLLECTED from Musa + DISBURSED to Ali), but the link between them is invisible in the data
- A RAPI agent collects from multiple buyers, then remits a combined amount to a farmer — individual collections and the final disbursement are unrelated records

Users have no way to say "this disbursement to Ali is the same money I collected from Musa."

---

## Proposed Solution

Add an optional `linkedTransactionId` field to the `Transaction` model:

```
Transaction A — COLLECTED ₦50,000 from Musa
    └── linkedTransactionId → Transaction B

Transaction B — DISBURSED ₦50,000 to Ali
    └── linkedTransactionId → Transaction A
```

The UI would show: _"This disbursement to Ali was made on behalf of Musa"_ and on Musa's transaction: _"Forwarded to Ali on your behalf."_

---

## Use Cases

1. **On-behalf forwarding** — Contact asks you to send money to a third party
2. **RAPI traceability** — Link individual buyer collections to the farmer disbursement
3. **Loan-to-gift conversion** — Already handled via `parentId`, but linked transactions could generalise this pattern
4. **Split disbursements** — One COLLECTED from a contact linked to multiple DISBURSED records (one-to-many)

---

## Key Design Questions

1. **Cardinality** — Is it one-to-one only, or one-to-many (one collection → multiple disbursements)?
2. **Mutual linking** — Should the link be bidirectional (both records point to each other) or unidirectional (child points to parent)?
3. **Validation** — Should the system enforce that linked amounts balance? Or is it informational only?
4. **UI surface** — Where is the link visible? Transaction detail page? Contact standing view?
5. **Witness scope** — Does a witness on Transaction A automatically cover Transaction B, or are they witnessed independently?
6. **Notifications** — When the linked disbursement is acknowledged, should the originating contact (Musa) also be notified?

---

## Likely Implementation Areas

- Add `linkedTransactionId String?` and `linkedTransaction Transaction?` self-relation on `Transaction` in `schema.prisma`
- Atlas migration
- Optional `linkedTransactionId` on `CreateTransactionInput` DTO
- Transaction detail resolver: include linked transaction in response
- Frontend: show linked transaction card on transaction detail page
- Notification: optionally notify the source contact when a linked disbursement is acknowledged

---

## Related

- `COLLECTED` / `DISBURSED` transaction types — primary types involved in triangular flows
- Organisation accounts — agents handling funds on behalf of an org will need this
- RAPI integration — multi-buyer-to-farmer remittance traceability
