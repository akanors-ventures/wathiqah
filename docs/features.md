# Features Guide

This guide details the core functionalities of Wathīqah and how to use them effectively.

## 💸 Transaction Management

The heart of Wathīqah is the transaction ledger.

### Creating a Transaction

1.  Navigate to the **Transactions** tab.
2.  Click **"New Transaction"**.
3.  Select **Intent** (the UI groups types into intents):
    - **Lending**: `LOAN_GIVEN` (you lent) or `LOAN_RECEIVED` (you borrowed).
    - **Repayment**: `REPAYMENT_MADE` (you repaid) or `REPAYMENT_RECEIVED` (contact repaid you).
    - **Gift**: `GIFT_GIVEN` or `GIFT_RECEIVED` — no repayment obligation.
    - **Advance / Deposit**: `ADVANCE_PAID`, `ADVANCE_RECEIVED`, `DEPOSIT_PAID`, or `DEPOSIT_RECEIVED`.
    - **Custody**: `ESCROWED` (holding funds) or `REMITTED` (disbursed funds).
4.  Select **Category**: Funds or Items.
5.  Enter **Details**: Amount/Quantity, Currency, Date, and Description.
6.  Select or Create a **Contact**.
7.  (Optional) Add a **Witness**.
8.  (Optional) Link to a **Project**.
9.  Click **Save**.

### Managing Repayments

When a debt is settled:

1.  Find the original `LOAN_GIVEN` or `LOAN_RECEIVED` transaction.
2.  Click **"Record Repayment"**.
3.  Enter the amount repaid. This creates a linked `REPAYMENT_RECEIVED` or `REPAYMENT_MADE` transaction.
    - _Partial Repayment_: The system tracks the remaining balance.
    - _Full Repayment_: The original transaction is marked as settled.

### Converting to Gift

If you decide to forgive a debt or if a loan becomes a gift:

1.  Open the transaction details.
2.  Select **"Convert to Gift"**.
3.  The system updates the record:
    - `LOAN_GIVEN` → `GIFT_GIVEN` (you forgave / gifted it out).
    - `LOAN_RECEIVED` → `GIFT_RECEIVED` (contact forgave your debt).
    - _Note_: Gift types do not count towards "Net Standing" — there is no repayment obligation.

## 👁️ Witness System

Add a layer of trust to your important transactions.

### Inviting a Witness

- During transaction creation, enter the witness's email or phone number.
- The system sends a secure invitation link.

### Witness Actions

- **Pending**: The witness has been invited but hasn't acted.
- **Acknowledged**: The witness verified the details.
- **Declined**: The witness disputed the details.
- **Modified**: The transaction was changed after witnessing; requires re-verification.

### Privacy

- Witnesses only see the specific transaction they are invited to.
- They do not see your other financial data or total balance.

## 🤝 Shared Access

Grant read-only access to your ledger for trusted partners (e.g., spouse, accountant, business partner).

### Granting Access

1.  Go to **Settings > Shared Access**.
2.  Click **"Grant Access"**.
3.  Enter the recipient's email.
4.  Set **Permissions**:
    - _View All_: Full read access.
    - _View Specific Projects_: Limit access to selected projects.
    - _View Specific Contacts_: Limit access to transactions with specific people.
5.  Set **Duration** (Optional): Access expires automatically after this date.

### Revoking Access

- You can revoke access at any time from the Shared Access dashboard.
- Access is immediately terminated for the recipient.

## 📜 Promises & IOUs

Track informal commitments before they become transactions.

- **Create Promise**: "I promise to pay John $500 by Friday."
- **Due Dates**: Set reminders for fulfillment.
- **Conversion**: Convert a fulfilled promise directly into a Transaction.

## 📊 Reporting & Analytics

Gain insights into your financial relationships.

- **Dashboard**: High-level view of Cash Position (Liquidity) and Net Worth (Assets - Liabilities).
- **Contact Analysis**: See who your top creditors and debtors are.
- **Asset Allocation**: Breakdown of funds by currency and type.
- **Export**: Download reports as CSV or PDF for offline record-keeping.

## 📱 Mobile Responsive

Wathīqah is fully responsive and works seamlessly on:

- Desktop Browsers
- Tablets
- Mobile Phones

_(Note: The mobile experience is optimized for quick entry and checking balances on the go.)_
