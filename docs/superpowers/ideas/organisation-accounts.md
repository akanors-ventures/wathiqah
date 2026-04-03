# Organisation Accounts — Feature Idea

**Status:** Idea — not yet designed or scoped
**Captured:** 2026-04-03
**Origin:** RAPI integration surfaced the need for non-personal transaction contexts

---

## The Problem

All Wathīqah accounts are currently personal. Organisations (cooperatives, microfinance agents, businesses, NGOs) need to record transactions on behalf of the organisation — not against a personal ledger. Mixing org-level transactions with personal ones creates noise, attribution confusion, and incorrect balance calculations.

---

## What It Enables

- A RAPI agent logs in under their cooperative's account, not a personal account
- Transactions are attributed to the organisation ("Kano Farmers Coop") not a person
- Multiple staff members can operate under the same org account with role-based access
- Org-level subscription and SMS quota (separate from personal)

---

## Key Design Questions to Resolve

### 1. Account model

- Does one Wathīqah user switch between personal and org mode (like Instagram switching profiles)?
- Or are org accounts completely separate logins?
- Can a person be a member of multiple orgs?

### 2. Membership & roles

- **Admin** — manages members, billing, settings
- **Operator** — creates/edits transactions
- **Viewer** — read-only access

### 3. Data separation

- Are org contacts separate from personal contacts?
- Are org transactions fully isolated from personal transactions?
- Can an org's transactions reference personal users as contacts?

### 4. Witnesses in org context

- Can an org staff member witness a transaction recorded by the same org?
- Or must witnesses be external?

### 5. Subscriptions

- Is the org plan tied to the org entity or to the admin user?
- Does each operator consume SMS quota, or does the org have a shared pool?

### 6. Transaction attribution

- On notifications to contacts: does the message say "[Org name]" or "[Staff member name] on behalf of [Org]"?

### 7. Onboarding

- How does an org register? Same flow as personal + an "upgrade to org" step?
- Do existing personal users convert, or create a new org account alongside?

---

## Likely Implementation Areas

- New `Organisation` entity (Prisma + GraphQL)
- `OrganisationMember` join table with `role` enum
- Auth: JWT claims extended to include active org context
- All existing modules (transactions, contacts, witnesses, notifications) need org-scoped queries
- Frontend: account switcher UI, org settings page, member management

---

## Related

- `COLLECTED` / `DISBURSED` transaction types — natural fit for org/agent use cases
- RAPI integration — primary driver for this feature
