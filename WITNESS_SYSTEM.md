# Witness System - Feature Summary

## 🎯 Feature Overview

The **Witness System** adds accountability and trust to financial transactions by allowing users to invite witnesses who can acknowledge that a transaction occurred.

## 🔑 Key Capabilities

### For Transaction Creators

1. **Add Witnesses** when creating a transaction:
   - Select existing users from the system
   - Invite new users via email (they'll receive an invitation link)
   - Add multiple witnesses to a single transaction

2. **Track Witness Status**:
   - See which witnesses have acknowledged
   - See which witnesses are still pending
   - See if any witnesses declined

### For Witnesses

1. **Seamless Invitation**:
   - New users receive an invitation link with pre-filled email details.
   - Secure token-based onboarding automatically links the new account to **ALL** relevant contact records globally.
   - No manual linking required; transaction access is granted instantly.

2. **Acknowledge Transactions**:
   - View transaction details (amount, date, description, and direction-aware type)
   - Choose to Acknowledge or Decline
   - See all pending witness requests in one place
   - Receive notifications when a witnessed transaction is modified.

## 📊 Witness Status Flow

```
PENDING → User creates transaction with witnesses
    ↓
    ├─→ ACKNOWLEDGED → Witness confirms the transaction
    │
    ├─→ DECLINED → Witness disputes the transaction
    │
    └─→ MODIFIED → Transaction was edited after acknowledgement (Requires re-review)
```

## 🛡️ Data Integrity & Immutability

To ensure that verified records remain trustworthy:

1. **No Deletion**: Transactions with witnesses cannot be hard-deleted. If a user wants to remove one, it is marked as `CANCELLED`.
2. **Audit History**: All changes to witnessed transactions (Amount, Date, Description, Status) are recorded in the `TransactionHistory` with a before/after diff.
3. **Status Reset**: Any update to an `ACKNOWLEDGED` transaction automatically resets witness statuses to `MODIFIED`, alerting witnesses that the record they verified has changed.

## 🎨 User Experience

### Creating a Transaction with Witnesses

1. User fills out transaction form (amount, contact, date)
2. In the "Add Witnesses" section:
   - **Option A**: Search and select existing users
   - **Option B**: Enter email addresses for new users
3. Submit transaction
4. Witnesses receive notifications (future: email/SMS)

### Acknowledging as a Witness

**For Existing Users:**

1. Log in to account
2. Navigate to "My Witness Requests"
3. Review transaction details
4. Click "Acknowledge" or "Decline"

**For New Users (Invited):**

1. Click invitation link from email
2. See transaction details
3. Create account (set password)
4. Click "Acknowledge" or "Decline"

## 🔒 Security & Privacy

- **Secure Tokens**: Invitation links use cryptographically secure UUIDs
- **Single-Use**: Invitation tokens are cleared after first use
- **Authorization**: Only invited witnesses can acknowledge their records
- **Privacy**: Witnesses only see transactions they're invited to

## 💡 Use Cases

### Personal Loans

> "I lent $500 to John. I added Sarah as a witness. She acknowledged seeing me hand John the cash."

### Shared Expenses

> "I paid $200 for groceries. I added my roommates as witnesses so everyone knows I covered it."

### Business Transactions

> "I received $1000 from a client. I added my business partner as a witness for our records."

### Family Finances

> "I gave my son $100 for school supplies. I added my spouse as a witness for our budget tracking."

## 🛠️ Technical Implementation

### Database Models

- **User**: Stores user information (including invited witnesses)
- **Transaction**: Stores transaction details
- **Witness**: Links users to transactions with status tracking

### GraphQL API

- `createTransaction(input)`: Create transaction with witnesses
- `acknowledgeWitness(witnessId, status)`: Acknowledge or decline
- `myWitnessRequests(status)`: Query pending witness requests

### Frontend Components

- `WitnessInviteForm`: Add witnesses to transactions
- `WitnessStatusBadge`: Display witness status with color coding
- `WitnessList`: Show all witnesses for a transaction
- `WitnessRequestPage`: View and manage witness requests

## 📈 Future Enhancements

### Phase 2 (Completed ✅)

- Email notifications for witness invitations (via Mailtrap/SendGrid)
- SMS notifications (via Twilio)
- Witness invitation expiration

### Phase 3 (Planned)

- Real-time notifications (GraphQL subscriptions)
- Witness activity timeline
- Bulk witness management
- Witness templates (frequently used witnesses)

## 🎓 Why This Matters

Financial disputes often arise from:

- "I don't remember receiving that money"
- "I never agreed to that amount"
- "There's no proof this happened"

The witness system provides:

- ✅ **Accountability**: Third-party verification
- ✅ **Trust**: Transparent record-keeping
- ✅ **Shared Ledger**: Automatic synchronization with platform users
- ✅ **Peace of Mind**: Clear documentation
- ✅ **Dispute Resolution**: Evidence if disagreements arise

---

**With witnesses, your financial records become more than just notes—they become verified events.**
