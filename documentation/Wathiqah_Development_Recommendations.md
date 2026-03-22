# Wathīqah — Development Recommendations
**Prepared for: Akanors Ventures Ltd. (RC 9035454)**
**Document Type: Internal Product Planning Reference**
**Status: Pre-Implementation — Next Development Cycle**

---

## Context and Purpose

This document captures strategic product recommendations for Wathīqah's next development cycle, informed by the intersection of three Akanors business lines: the Wathīqah platform itself, the Akanors Livestock Enterprise, and the RAPI (Rural Agricultural Payment Infrastructure) initiative. These recommendations are not generic product suggestions — they are grounded in the specific use cases, user types, and commercial logic of the Akanors ecosystem.

The goal is to make Wathīqah more than a personal financial ledger. The goal is to make it the **trust infrastructure layer** for informal and semi-formal commerce across the communities Akanors serves.

---

## Current System State (Baseline)

Before listing recommendations, the current system is documented accurately to prevent overbuilding features that already exist.

| Feature | Current State |
|---|---|
| Transaction recording | ✅ Live — creator logs fund, item, or promise against a contact |
| Witness invitation | ✅ Live — creator adds witnesses during or after transaction creation |
| Witness SMS notification | ✅ Live — Pro users only; includes transaction details and acknowledgment link |
| Witness email notification | ✅ Live — all users |
| Witness acknowledgment flow | ✅ Live — existing users click link; new users redirected after signup |
| Immutable record on acknowledgment | ✅ Live — transaction locked after witness confirms |
| Contact notification | ❌ Not yet built — contact receives no notification when logged |
| Offline functionality | ❌ Not supported — internet required |
| Contact SMS notification | ❌ Not yet built |
| Agent/provisioned Pro accounts | ❌ Not yet built |
| USSD or SMS-only access | ❌ Not in scope currently |

---

## Recommendation 1 — Contact Notification SMS

### What It Is
When a transaction is recorded against a contact's phone number, the contact receives an SMS notifying them that a record exists in their name, regardless of whether they are a Wathīqah member.

### Proposed SMS Format
```
[Name or "Someone"], a transaction of ₦[amount] has been 
recorded in your name by [creator display name] on Wathīqah 
and witnessed by [witness name]. View your record anytime 
at wathiqah.akanors.com. Reply STOP to opt out.
```

### Why It Matters

This is the single highest-impact feature on the roadmap. It transforms Wathīqah from a one-sided documentation tool into a genuinely bilateral trust system — and simultaneously becomes the platform's most powerful organic acquisition channel.

Every SMS sent to a non-member contact is a personalized, context-rich acquisition message delivered inside a real financial moment. The recipient is not being cold-contacted — they are being told that a real transaction involving real money was documented in their name by someone they know. The conversion rate on that message will exceed any paid advertisement by a significant margin.

For the RAPI use case specifically, this feature closes the real-time farmer trust gap. A farmer who receives an SMS confirmation at the point of sale — showing the amount, the agent's name, and the community champion's witness — holds independent proof in their hand before releasing their goods. This does not require the farmer to be a Wathīqah member in advance.

### Access Tier Recommendation

| Tier | Contact Notification SMS Allowance |
|---|---|
| Free | 10 per month |
| Pro | Unlimited |

**Rationale:** The network effect and acquisition engine must work at every tier, not just Pro. Capping free usage at 10 per month gives free users genuine access to the feature while creating natural upgrade pressure for users who operate at volume — traders, cooperative managers, RAPI agents.

### Compliance Requirement
Include opt-out instruction in every contact notification SMS ("Reply STOP to opt out"). This is both regulatory good practice and a trust signal — a message that respects the recipient's choice is more trusted than one that does not.

---

## Recommendation 2 — Provisioned Pro Accounts for RAPI Agents

### What It Is
A backend account type — distinct from paid Pro subscriptions — where Pro-tier access is granted by the RAPI division of Akanors as an operational provision rather than purchased by the individual user.

### How It Works
- RAPI agent is onboarded and their Wathīqah account is flagged as `pro_provisioned` in the database
- They receive full Pro functionality including unlimited witness SMS and unlimited contact notification SMS
- Their account status is tied to active agent status — if they stop operating as a RAPI agent, the provisioned Pro flag is removed and the account reverts to free tier
- Provisioned accounts are tracked separately from paid Pro subscriptions in revenue reporting to maintain accurate financial metrics

### Why This Model Over Discount or Subscription

Asking an agent to pay — even at a discount — creates friction at the recruitment stage, before the agent has earned anything. The provisioned model inverts this: the Pro account is a recruitment incentive, a genuine benefit that has tangible monetary value and communicates that Akanors values the agent's participation. It also makes operational sense — agent Pro accounts are an infrastructure cost of the RAPI division, directly offset by the transaction fee revenue those agents generate.

### Accounting Treatment
RAPI division carries the cost of provisioned agent Pro accounts as an operational line item. The cost per provisioned account is the marginal SMS and infrastructure cost of Pro-tier usage, not the full retail Pro subscription price. This should be calculated and budgeted per agent before provisioning begins at scale.

---

## Recommendation 3 — Transaction Notification to Contact on Signup

### What It Is
When a person who has been logged as a contact on one or more transactions finally creates a Wathīqah account, they immediately see all transactions that were recorded against their number — including witness status, amounts, dates, and the identities of creators and witnesses.

### Current State
This already exists in principle based on the described system architecture — records persist against a contact's number and become visible when they join. This recommendation is about making the **onboarding moment** explicitly powerful rather than letting it happen passively.

### Proposed Enhancement
On the new user's first login, if they have existing transactions logged against their number, display a dedicated onboarding screen — before the standard dashboard — that says:

```
Welcome to Wathīqah.

You have [X] transactions recorded in your name 
before you joined. Review them now.
```

This moment — seeing documented history that predates their account — is the highest-trust, highest-retention onboarding experience possible. It demonstrates the platform's value immediately and concretely, without requiring the new user to create anything themselves first.

---

## Recommendation 4 — Pricing Page and Conversion Optimization

### Context
The Wathīqah landing page at wathiqah.akanors.com has a Pricing link and a "Go Pro" button, indicating a Pro tier exists or is planned. The recommendations below apply whether the pricing page is partially built or not yet complete.

### What a Properly Converting Pricing Page Requires

**1. Tiers must be named and clearly differentiated**

Not just "Free" and "Pro" — but named with identity. Consider names that reflect the user types in your actual market. The specific names are a product decision, but the principle is that a named tier feels like a product category, not just a price point.

**2. The conversion trigger must be explicit**

The free tier limit that most urgently creates upgrade pressure is the witness SMS and the contact notification SMS. The pricing page must say clearly what the free monthly allowance is and what Pro unlocks. Users who hit the limit should see an in-app prompt that links directly to the upgrade flow — not just a generic error message.

**3. Price must be visible before signup**

A significant portion of potential users evaluate affordability before creating an account. Hiding pricing behind a signup wall loses these users entirely. Show Naira pricing prominently with monthly and annual options, where annual provides a meaningful discount — ideally two months free.

**4. Payment infrastructure must be fully functional**

Paystack or Flutterwave integration must allow a user to upgrade to Pro at any time of day without any manual intervention from the Akanors side. Subscriptions must auto-renew, send renewal receipts, and handle failed payments gracefully with retry logic and notification.

**5. Free tier must be genuinely useful but genuinely limited**

If free users can do everything indefinitely, there is no upgrade incentive. If free users can do almost nothing, they leave before experiencing the product's value. The correct balance for Wathīqah is that free users can document transactions and send email notifications without limit, but SMS capabilities — both witness and contact notification — are capped monthly. This creates upgrade pressure at exactly the moment the product is most valuable: when a user is actively managing a real financial relationship.

---

## Recommendation 5 — Islamic Positioning and Market Framing

### Context
Wathīqah's name, concept, and function are deeply rooted in Islamic commercial ethics. The Arabic word Wathīqah means a document or written record. The Quranic instruction in Surah Al-Baqarah 2:282 — the longest verse in the Quran — explicitly commands believers to write down debts and to appoint witnesses when engaging in credit transactions. Wathīqah is, functionally, a digital implementation of this Quranic instruction.

### The Recommendation
This framing is not currently visible on the landing page. It should be. Not as religious marketing — but as genuine product positioning that explains *why this product exists* in a way that resonates deeply with your primary market: Muslim communities in Nigeria and West Africa who engage in informal credit and who take the Quranic instruction on documentation seriously but have never had a practical tool to fulfill it digitally.

A single section on the landing page titled something like **"Built on a 1,400-Year-Old Instruction"** — referencing 2:282 and explaining that Wathīqah makes that instruction practical for modern financial relationships — would differentiate the product in a way that no competitor can copy by adding a feature. It is identity-level differentiation.

This positioning also directly supports the Sharia-compliant framing of RAPI and the Akanors Livestock Enterprise, creating a unified brand voice across all three Akanors products.

---

## Recommendation 6 — Wathīqah as RAPI Trust Infrastructure (Integration Roadmap)

### Dependency Chain
The following features must exist before Wathīqah can function as RAPI's real-time trust verification layer:

| # | Feature | Status | Blocks |
|---|---|---|---|
| 1 | Contact notification SMS | ❌ Not built | Farmer real-time confirmation |
| 2 | Contact SMS on free tier (10/month) | ❌ Not built | Agent recruitment without Pro barrier |
| 3 | Provisioned Pro accounts for agents | ❌ Not built | Agent onboarding at scale |
| 4 | Pricing and payment infrastructure | Partial | Agent Pro provisioning accounting |

### Integration Flow Once Dependencies Are Met

```
1. RAPI agent (Pro provisioned) opens Wathīqah on mobile
2. Agent records transaction — farmer's phone number as contact, 
   amount, commodity, and date
3. Agent adds community champion as witness
4. Champion receives SMS with transaction details and acknowledgment link
5. Farmer receives SMS confirming the record exists in their name
6. Champion acknowledges on Wathīqah (existing or new account)
7. Record is immutable — timestamped, witnessed, documented
8. Farmer releases goods
9. When farmer eventually joins Wathīqah, full transaction history 
   is waiting — complete audit trail of every RAPI season
```

### What This Gives RAPI
- Real-time bilateral confirmation at point of sale
- Immutable audit trail for every seasonal transaction
- Farmer credit history built passively over time
- Dispute resolution mechanism with third-party witness records
- Investor-grade transaction data with no additional data collection infrastructure

### What This Gives Wathīqah
- A structured, high-volume user acquisition pipeline through RAPI agent networks
- Real-world proof of concept for the witness system at commercial scale
- A use case demonstrable to Islamic development finance investors
- Organic farmer onboarding — every farmer who transacts through RAPI receives Wathīqah SMS notifications before ever hearing of the product by name

---

## Development Priority Order

Based on impact, dependency, and available infrastructure:

| Priority | Feature | Effort Estimate | Impact |
|---|---|---|---|
| 1 | Contact notification SMS (Pro unlimited) | Low — SMS infrastructure exists | Very High |
| 2 | Contact notification SMS (Free tier — 10/month) | Very Low — same as above with counter | High |
| 3 | Opt-out compliance on all contact SMS | Very Low | Required |
| 4 | Pricing page completion and payment integration | Medium | High |
| 5 | Provisioned Pro account flag in database | Low | High for RAPI |
| 6 | Onboarding screen for users with pre-existing records | Low-Medium | High retention |
| 7 | Islamic positioning on landing page | Low | High differentiation |

---

## Summary

Wathīqah's current architecture is sound. The witness system, SMS notification infrastructure, and immutable record design are all the right foundations. The gap between where the product is today and where it needs to be to serve as RAPI's trust backbone is not architectural — it is a single primary feature (contact notification SMS) and a set of supporting product decisions around pricing, account provisioning, and positioning.

None of these require rebuilding anything. They require extending what already exists one step further — toward the contact, toward the agent, and toward the community that both products are ultimately built to serve.

---

*Document prepared by Claude (Anthropic) in consultation with Abdganiyu Fawaz Opeyemi, Director, Akanors Ventures Ltd.*
*For internal use only — Akanors Ventures Ltd. (RC 9035454)*
