import {
  PROJECT_EXPENSE_CONTACT_TRANSACTION_TYPES,
  PROJECT_INCOME_CONTACT_TRANSACTION_TYPES,
} from '@wathiqah/shared-constants';
import { TransactionType } from '../../generated/prisma/client';

describe('shared-constants — project cash-flow direction arrays', () => {
  const allActiveTransactionTypes = Object.values(TransactionType);

  it('are disjoint — no type appears in both the income and expense list', () => {
    const overlap = PROJECT_INCOME_CONTACT_TRANSACTION_TYPES.filter((type) =>
      (PROJECT_EXPENSE_CONTACT_TRANSACTION_TYPES as readonly string[]).includes(
        type,
      ),
    );

    expect(overlap).toEqual([]);
  });

  it('are jointly exhaustive over every active TransactionType', () => {
    const covered = new Set([
      ...PROJECT_INCOME_CONTACT_TRANSACTION_TYPES,
      ...PROJECT_EXPENSE_CONTACT_TRANSACTION_TYPES,
    ]);

    const uncovered = allActiveTransactionTypes.filter(
      (type) => !covered.has(type),
    );

    expect(uncovered).toEqual([]);
  });

  it('contain no value outside the active TransactionType enum', () => {
    const validTypes = new Set(allActiveTransactionTypes as string[]);

    const invalidIncome = PROJECT_INCOME_CONTACT_TRANSACTION_TYPES.filter(
      (type) => !validTypes.has(type),
    );
    const invalidExpense = PROJECT_EXPENSE_CONTACT_TRANSACTION_TYPES.filter(
      (type) => !validTypes.has(type),
    );

    expect(invalidIncome).toEqual([]);
    expect(invalidExpense).toEqual([]);
  });
});
