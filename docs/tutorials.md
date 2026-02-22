# Tutorials & Examples

Practical guides to help you get the most out of Wathīqah's features.

## 📝 Tutorial 1: Recording a Personal Loan

**Scenario**: You lent $500 to your friend "Alice" for car repairs, and you want to track it.

1.  **Create Contact**:
    *   Go to **Contacts** > **New Contact**.
    *   Name: "Alice".
    *   Email (Optional): "alice@example.com" (Enter this if you want to link to her account later).
    *   Click **Save**.

2.  **Record Transaction**:
    *   Go to **Transactions** > **New Transaction**.
    *   **Type**: Select "Given" (You gave the money).
    *   **Category**: "Funds".
    *   **Amount**: 500.
    *   **Currency**: USD.
    *   **Contact**: Select "Alice".
    *   **Description**: "Loan for car repairs".
    *   **Date**: Today's date.
    *   Click **Save**.

3.  **Result**:
    *   Alice's "Net Standing" will show she owes you **$500**.
    *   Your Dashboard will reflect this as an asset.

## 📝 Tutorial 2: Adding a Witness for Accountability

**Scenario**: You are lending a specialized tool (Drill Set) to a neighbor, "Bob", and want to ensure it's returned in good condition.

1.  **Create Transaction**:
    *   **Type**: Given (Lent).
    *   **Category**: Items.
    *   **Item Name**: "DeWalt Cordless Drill Set".
    *   **Quantity**: 1.
    *   **Contact**: Bob.

2.  **Add Witness**:
    *   In the "Witness" section, click "Add Witness".
    *   Enter the email of a mutual friend, e.g., "charlie@example.com".

3.  **Process**:
    *   Charlie receives an email: "John has listed you as a witness for lending a Drill Set to Bob."
    *   Charlie clicks the link and selects **"Acknowledge"**.
    *   The transaction is now **Verified**. If Bob later claims he never borrowed it, you have a verified record.

## 💻 Developer Example: Fetching Transactions (React/Apollo)

If you are contributing to the frontend, here is how to fetch transactions using our custom hooks.

```tsx
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionList } from '@/components/transactions/TransactionList';

export function RecentActivity() {
  const { transactions, loading, error } = useTransactions({
    limit: 5,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
      <TransactionList items={transactions} />
    </div>
  );
}
```

## 💻 Developer Example: Creating a Promise (Mutation)

```tsx
import { useMutation } from '@apollo/client';
import { CREATE_PROMISE } from '@/lib/apollo/queries/promises';

export function CreatePromiseForm() {
  const [createPromise, { loading }] = useMutation(CREATE_PROMISE);

  const handleSubmit = async (data) => {
    try {
      await createPromise({
        variables: {
          input: {
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            contactId: data.contactId
          }
        }
      });
      toast.success('Promise created!');
    } catch (err) {
      toast.error('Failed to create promise');
    }
  };

  return (
    // ... form implementation
  );
}
```
