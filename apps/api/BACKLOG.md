# Backlog

## Transaction Update & Witness Re-acknowledgement Workflow

**Status:** Pending Implementation
**Priority:** High (Required for production witness system)

### Context
When a transaction is updated *after* witnesses have already acknowledged it, the integrity of the witness verification is compromised. The witness verified the *original* state, not the *new* state.

### Current Implementation (MVP)
- **Transaction History**: The system now tracks all updates in a `TransactionHistory` table, recording the `previousState`, `newState`, `changeType`, and the user who made the change.
- **Status Updates**: When a transaction with acknowledged witnesses is updated, the witnesses' status is changed to `MODIFIED` (instead of `PENDING`) to clearly indicate that a previously acknowledged transaction has changed.
- **Audit Log**: Every update action creates an immutable history record.

### Future Requirements

1.  **Notification System**:
    - Trigger an email/push notification to all witnesses when a transaction they witnessed is updated.
    - Message: "A transaction you witnessed has been modified. Please review and re-acknowledge."
    - Differentiate notification content based on change type (e.g., minor description fix vs. amount change).

2.  **Frontend History Viewer**:
    - **Timeline View**: A UI component to visualize the lifecycle of a transaction (Created -> Acknowledged -> Updated -> Re-acknowledged).
    - **Diff View**: A visual comparison tool showing "Before" vs "After" for each history entry (using the `previousState` and `newState` JSON fields).
    - **Status Indicators**: Distinct badges for `PENDING` (never seen), `ACKNOWLEDGED` (seen & verified), and `MODIFIED` (seen old version, needs to verify new).

3.  **Export Capability**:
    - Generate PDF/CSV reports that include the full audit trail/history of transactions for legal/record-keeping purposes.

4.  **Advanced Access Control**:
    - Implement granular permissions for viewing history (e.g., should the counterparty see the internal edit history?).

5.  **Locking Mechanism**:
    - Optional: Prevent updates entirely if a transaction is "Finalized" or "Locked" by all parties.
