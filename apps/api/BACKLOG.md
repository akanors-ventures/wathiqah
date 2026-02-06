# Backlog

## Project & Fund Management

**Status:** Pending Implementation
**Priority:** High (Strategic Fit)

### Description

Implement a system to create "Projects" that act as scoped ledgers for specific goals (e.g., "Home Renovation", "Charity Drive"). This allows users to track funds allocated to a project and expenses incurred against it, closing the loop on "Trusted Ledger".

### Requirements

1.  **Data Model**:
    - **Project**: `name`, `budget`, `balance`, `currency`.
    - **ProjectTransaction**: `amount`, `type` (INCOME/EXPENSE), `category`, `description`.
2.  **Logic**:
    - Atomic balance updates.
    - Expenses deduct from balance; Income adds to balance.
3.  **UI/UX**:
    - Project Dashboard (Budget vs Actuals).
    - Quick "Add Expense" form.

---

## Transaction Update & Witness Re-acknowledgement Workflow

**Status:** Completed ✅
**Priority:** High (Required for production witness system)

### Context

When a transaction is updated _after_ witnesses have already acknowledged it, the integrity of the witness verification is compromised. The witness verified the _original_ state, not the _new_ state.

### Implementation Details

- **Transaction History**: The system now tracks all updates in a `TransactionHistory` table, recording the `previousState`, `newState`, `changeType`, and the user who made the change.
- **Status Updates**: When a transaction with acknowledged witnesses is updated, the witnesses' status is changed to `MODIFIED` (instead of `PENDING`) to clearly indicate that a previously acknowledged transaction has changed.
- **Audit Log**: Every update action creates an immutable history record.
- **Removal Protection**: Transactions with witnesses use `CANCELLED` status instead of hard deletion to maintain the audit trail.
- **Frontend History Viewer**: Implemented a timeline view in the transaction details page to show the lifecycle and changes.

### Future Requirements

1.  **Notification System**: (Completed ✅)
    - Trigger an email notification to all witnesses when a transaction they witnessed is updated.
    - Message: "A transaction you witnessed has been modified. Please review and re-acknowledge."
    - Differentiate notification content based on change type (e.g., minor description fix vs. amount change).

2.  **Frontend History Viewer**: (Completed ✅)
    - **Timeline View**: A UI component to visualize the lifecycle of a transaction (Created -> Acknowledged -> Updated -> Re-acknowledged).
    - **Diff View**: A visual comparison tool showing "Before" vs "After" for each history entry (using the `previousState` and `newState` JSON fields).
    - **Status Indicators**: Distinct badges for `PENDING` (never seen), `ACKNOWLEDGED` (seen & verified), and `MODIFIED` (seen old version, needs to verify new).

---

## Invitation & Contact Linking System

**Status:** Completed ✅
**Priority:** High (Onboarding Experience)

### Description

A zero-friction onboarding system that automatically links new users to existing contact records that invited them.

### Implementation Details

1.  **Secure Invitations**: Generates unique tokens for invited contacts, sent via SendGrid.
2.  **Smart Onboarding**: Signup links carry `token` and `email` to pre-fill registration forms.
3.  **Automatic Reconciliation**: On signup, the system validates the token and automatically sets the `linkedUserId` on the originating contact record.
4.  **Legacy Data Linking**: New users immediately see all transactions previously recorded against their email address with flipped perspectives.

---

## System-Wide Quality & Type Safety

**Status:** Completed ✅
**Priority:** Critical (Maintenance)

### Achievements

1.  **Strict Type Safety**: Eliminated all `any` type usages across the entire codebase (frontend & backend).
2.  **Automated Validation**: Integrated Zod with TanStack Router and NestJS for end-to-end schema validation.
3.  **Interceptor Logging**: Implemented a type-safe logging interceptor that redacts sensitive information.
4.  **Prisma Type Integration**: Leveraged full Prisma client types for all database operations and history snapshots.

3.  **Export Capability**:
    - Generate PDF/CSV reports that include the full audit trail/history of transactions for legal/record-keeping purposes.

4.  **Advanced Access Control**:
    - Implement granular permissions for viewing history (e.g., should the counterparty see the internal edit history?).

5.  **Locking Mechanism**:
    - Optional: Prevent updates entirely if a transaction is "Finalized" or "Locked" by all parties.

---

## Shared Transaction, Witness & Promise Viewer Access

**Status:** Completed ✅
**Priority:** Medium

### Description

Implement a system that allows users to grant view-only access to their saved transactions, documented witness information, and promises to a list of specified email addresses.

### Requirements (Implemented)

1.  **Management Interface**:
    - Create "Share Access" or "Viewers" section.
    - Add, edit, and remove email addresses.
    - Validate email format.

2.  **Access Control**:
    - Grant read-only access to transactions, witnesses, and promises.
    - Ensure viewers cannot modify, delete, or download data.
    - Allow granter to revoke access immediately.

3.  **Notifications**:
    - Send email to granted address with secure login/viewing instructions.

4.  **Viewer Dashboard**:
    - Dedicated read-only view for granted users.
    - Track acceptance status of the access grant.

---

## Promise Documentation

**Status:** Completed ✅
**Priority:** Medium

### Description

Implement a feature that allows users to create, track, and manage personal promises made to other individuals.

### Requirements (Implemented)

1.  **Data Model**:
    - **Description**: Clear text of what was promised (Mandatory).
    - **Promise To**: Person/entity the promise was made to (Mandatory).
    - **Due Date/Time**: Proposed fulfillment time (Mandatory).
    - **Optional**: Notes, Priority (High/Medium/Low), Category/Tag.
    - **Status**: Pending, Fulfilled, Overdue (Auto-updates based on due date).

2.  **UI/UX**:
    - "My Promises" section/module.
    - Create/Edit Promise Form.
    - List/Dashboard view with filtering (status, due date).
    - Actions: View, Edit, Mark as Fulfilled, Delete.
