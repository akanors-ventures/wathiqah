# Project Overview

## 🎯 Purpose

**Wathīqah** (Arabic for "Document" or "Bond") is a digital ledger application designed to bring clarity and accountability to personal and shared finances. Unlike traditional expense trackers, Wathīqah focuses on **relationships** and **trust**. It allows users to document funds given, received, or collected, as well as physical items lent or borrowed.

The core philosophy is: **"Clarity Over Conflict."** By documenting financial interactions and involving trusted witnesses, Wathīqah helps preserve relationships that might otherwise be strained by forgotten debts or misunderstood agreements.

## 👥 Target Audience

Wathīqah is built for:

- **Individuals**: Tracking personal loans, debts, and items lent to friends and family.
- **Small Business Owners**: Managing informal credit, IOUs, and item tracking with partners or clients.
- **Families**: Sharing financial responsibilities and tracking shared assets.
- **Community Groups**: Managing pooled funds or shared resources with transparency.

## 💡 Key Concepts

### 1. Financial Philosophy

- **Credit over Debt**: The system encourages a "Giver" mindset. Being a creditor (e.g., `LOAN_GIVEN`) is visually distinguished from being a debtor (e.g., `LOAN_RECEIVED`).
- **Relationship-Centric**: Transactions are always linked to a "Contact." The system calculates your "Net Standing" with each contact—do they owe you, or do you owe them?

### 2. Transaction Categories

- **FUNDS**: Monetary transactions. Supports multi-currency (NGN, USD, GBP, etc.) with real-time exchange rate conversion for reporting.
  - _Types_: `LOAN_GIVEN`, `LOAN_RECEIVED`, `REPAYMENT_MADE`, `REPAYMENT_RECEIVED`, `GIFT_GIVEN`, `GIFT_RECEIVED`, `ADVANCE_PAID`, `ADVANCE_RECEIVED`, `DEPOSIT_PAID`, `DEPOSIT_RECEIVED`, `ESCROWED`, `REMITTED`.
- **ITEMS**: Physical objects (e.g., tools, electronics, books). Tracks quantity and description.
  - _Types_: `LOAN_GIVEN` (lent), `LOAN_RECEIVED` (borrowed), `REPAYMENT_MADE`/`REPAYMENT_RECEIVED` (returned).

### 3. The Witness System

A unique feature of Wathīqah is the ability to add a **Witness** to any transaction.

- **Accountability**: A third party verifies the transaction details.
- **Security**: Witnesses receive a secure link to acknowledge or decline the record without needing full account access.
- **Immutability**: Once witnessed, a transaction cannot be secretly altered. Any change notifies the witness and resets the verification status.

### 4. Shared Ledger & Perspective Flipping

When you transact with another Wathīqah user:

- **Auto-Linking**: If you add a transaction with a user's email, it automatically appears in their ledger.
- **Perspective Flipping**: Transaction types flip to represent each party's view:
  - `LOAN_GIVEN` ↔ `LOAN_RECEIVED` — "I lent $50 to John" → John sees "I borrowed $50"
  - `REPAYMENT_MADE` ↔ `REPAYMENT_RECEIVED`
  - `GIFT_GIVEN` ↔ `GIFT_RECEIVED`
  - `ADVANCE_PAID` ↔ `ADVANCE_RECEIVED`
  - `DEPOSIT_PAID` ↔ `DEPOSIT_RECEIVED`
  - `ESCROWED` ↔ `REMITTED`
  - This ensures both parties see the same reality from their own perspective.

### 5. Projects

Group related transactions into **Projects** (e.g., "House Renovation", "Wedding", "Business Trip"). This allows for aggregated tracking of funds and items across multiple contacts and transaction types.
