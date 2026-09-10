/**
 * Minimal in-memory Prisma double for the personal-mirror ledger scenario
 * eval (personal-mirror-scenario.spec.ts). Real, not mocked-per-call: state
 * written by one service call (e.g. ContactsService.create) is actually read
 * back by the next (TransactionsService.create, then ContactsService.getBalance),
 * which is the whole point of a cross-service scenario test — per-call jest
 * mocks can't prove the pieces agree with each other once wired together.
 *
 * Implements only the subset of the Prisma Client surface the three services
 * exercised by the scenario (ContactsService, OrganisationsService,
 * TransactionsService) actually call. Not a general-purpose fake — extend
 * deliberately if a new query shape is needed, don't paper over gaps with a
 * permissive default.
 */

type Row = Record<string, unknown>;

function matchesCondition(rowValue: unknown, condition: unknown): boolean {
  if (condition === null || typeof condition !== 'object') {
    return rowValue === condition;
  }
  const cond = condition as Record<string, unknown>;
  if ('not' in cond) return rowValue !== cond.not;
  if ('in' in cond) return (cond.in as unknown[]).includes(rowValue);
  // Unsupported nested operator — fail loudly rather than silently matching
  // everything, so a future query shape gets an explicit fake-Prisma update
  // instead of a scenario that quietly proves nothing.
  throw new Error(
    `fake-prisma: unsupported where operator ${JSON.stringify(cond)}`,
  );
}

export class FakePrisma {
  contacts = new Map<string, Row>();
  transactions = new Map<string, Row>();
  allocations = new Map<string, Row>();
  members = new Map<string, Row>(); // key: `${orgId}:${userId}`
  users = new Map<string, Row>();
  private nextId = 1;

  private genId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }

  private matchesTransactionWhere(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, condition]) => {
      if (key === 'OR') {
        return (condition as Row[]).some((clause) =>
          this.matchesTransactionWhere(row, clause),
        );
      }
      if (key === 'AND') {
        return (condition as Row[]).every((clause) =>
          this.matchesTransactionWhere(row, clause),
        );
      }
      if (key === 'contact') {
        const contact = row.contactId
          ? this.contacts.get(row.contactId as string)
          : null;
        return this.matchesContactWhere(contact ?? {}, condition as Row);
      }
      return matchesCondition(row[key], condition);
    });
  }

  private matchesContactWhere(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, condition]) => {
      if (key === 'derivedContacts') {
        const cond = condition as { none?: Row };
        if (!cond.none) {
          throw new Error(
            'fake-prisma: only derivedContacts.none is supported',
          );
        }
        const hasDerived = [...this.contacts.values()].some(
          (c) =>
            c.sourceContactId === row.id &&
            this.matchesContactWhere(c, cond.none),
        );
        return !hasDerived;
      }
      return matchesCondition(row[key], condition);
    });
  }

  /**
   * Attaches the nested relations a `select` asks for. Balance math reads
   * `conversions`, `allocationsIn` and `allocationsOut` off each row, so a
   * findMany that ignored `select` would hand every caller an undischarged
   * principal and quietly prove nothing.
   */
  private hydrate(row: Row, select: Row): Row {
    const out: Row = { ...row };
    const nested = (key: string) => select[key] as { where?: Row } | undefined;

    const conversions = nested('conversions');
    if (conversions) {
      out.conversions = [...this.transactions.values()].filter(
        (c) =>
          c.parentId === row.id &&
          this.matchesTransactionWhere(c, conversions.where),
      );
    }
    const allocationsIn = nested('allocationsIn');
    if (allocationsIn) {
      out.allocationsIn = [...this.allocations.values()].filter(
        (a) =>
          a.targetTransactionId === row.id &&
          this.matchesTransactionWhere(a, allocationsIn.where),
      );
    }
    const allocationsOut = nested('allocationsOut');
    if (allocationsOut) {
      out.allocationsOut = [...this.allocations.values()].filter(
        (a) =>
          a.sourceTransactionId === row.id &&
          this.matchesTransactionWhere(a, allocationsOut.where),
      );
    }
    return out;
  }

  contact = {
    create: async ({ data }: { data: Row }) => {
      const id = this.genId('contact');
      const row: Row = { linkedUserId: null, orgId: null, ...data, id };
      this.contacts.set(id, row);
      return row;
    },
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        orgId_sourceContactId?: { orgId: string; sourceContactId: string };
      };
      select?: Row;
    }) => {
      if (where.id) return this.contacts.get(where.id) ?? null;
      if (where.orgId_sourceContactId) {
        const { orgId, sourceContactId } = where.orgId_sourceContactId;
        return (
          [...this.contacts.values()].find(
            (c) => c.orgId === orgId && c.sourceContactId === sourceContactId,
          ) ?? null
        );
      }
      throw new Error(
        `fake-prisma: unsupported contact.findUnique where ${JSON.stringify(where)}`,
      );
    },
    findMany: async ({ where }: { where?: Row }) =>
      [...this.contacts.values()].filter((c) =>
        this.matchesContactWhere(c, where),
      ),
    count: async ({ where }: { where?: Row }) =>
      (await this.contact.findMany({ where })).length,
  };

  transaction = {
    create: async ({ data }: { data: Row }) => {
      const id = this.genId('tx');
      const row: Row = { status: 'COMPLETED', ...data, id };
      this.transactions.set(id, row);
      return row;
    },
    findUnique: async ({
      where,
      include,
    }: {
      where: { id?: string; orgSourceTransactionId?: string };
      include?: Row;
      select?: Row;
    }) => {
      let row: Row | null = null;
      if (where.id) row = this.transactions.get(where.id) ?? null;
      else if (where.orgSourceTransactionId) {
        row =
          [...this.transactions.values()].find(
            (t) => t.orgSourceTransactionId === where.orgSourceTransactionId,
          ) ?? null;
      } else {
        throw new Error(
          `fake-prisma: unsupported transaction.findUnique where ${JSON.stringify(where)}`,
        );
      }
      if (!row) return null;
      if (include?.createdBy) {
        row = { ...row, createdBy: this.users.get(row.createdById as string) };
      }
      if (include?.contact) {
        row = {
          ...row,
          contact: row.contactId
            ? this.contacts.get(row.contactId as string)
            : null,
        };
      }
      // findOne() reads these unconditionally (`transaction.witnesses.length`),
      // so an include that silently returned undefined would crash rather than
      // exercise the code under test.
      if (include?.conversions) {
        const spec = include.conversions as { where?: Row };
        row = {
          ...row,
          conversions: [...this.transactions.values()].filter(
            (c) =>
              c.parentId === row?.id &&
              this.matchesTransactionWhere(c, spec?.where),
          ),
        };
      }
      if (include?.witnesses) {
        row = { ...row, witnesses: (row.witnesses as Row[]) ?? [] };
      }
      if (include?.history) {
        row = { ...row, history: (row.history as Row[]) ?? [] };
      }
      if (include?.personalMirror) {
        row = {
          ...row,
          personalMirror:
            [...this.transactions.values()].find(
              (t) => t.orgSourceTransactionId === row?.id,
            ) ?? null,
        };
      }
      return row;
    },
    findMany: async ({ where, select }: { where?: Row; select?: Row }) => {
      const rows = [...this.transactions.values()].filter((t) =>
        this.matchesTransactionWhere(t, where),
      );
      return select ? rows.map((row) => this.hydrate(row, select)) : rows;
    },
    count: async ({ where }: { where?: Row }) =>
      (await this.transaction.findMany({ where })).length,
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.transactions.get(where.id);
      if (!row) throw new Error(`fake-prisma: no transaction ${where.id}`);
      Object.assign(row, data);
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const row = this.transactions.get(where.id);
      this.transactions.delete(where.id);
      return row;
    },
    groupBy: async ({
      where,
      by,
    }: {
      where: Row;
      by: string[];
      _sum: { amount: true };
    }) => {
      const rows = await this.transaction.findMany({ where });
      const groups = new Map<string, { key: Row; sum: number }>();
      for (const row of rows) {
        const keyObj = Object.fromEntries(by.map((k) => [k, row[k]]));
        const key = JSON.stringify(keyObj);
        const existing = groups.get(key) ?? { key: keyObj, sum: 0 };
        existing.sum += Number(row.amount) || 0;
        groups.set(key, existing);
      }
      return [...groups.values()].map((g) => ({
        ...g.key,
        _sum: { amount: g.sum },
      }));
    },
    aggregate: async ({ where }: { where?: Row; _sum: { amount: true } }) => {
      const rows = await this.transaction.findMany({ where });
      const sum = rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      // Prisma returns null, not 0, for an empty aggregate.
      return { _sum: { amount: rows.length === 0 ? null : sum } };
    },
  };

  /**
   * Allocation links (TransactionAllocation). Real rows, like everything else
   * here, so settlement sums that span children AND allocations are actually
   * exercised rather than stubbed to zero.
   */
  transactionAllocation = {
    create: async ({ data }: { data: Row }) => {
      const id = this.genId('alloc');
      const row: Row = { status: 'ACTIVE', ...data, id };
      this.allocations.set(id, row);
      return row;
    },
    findUnique: async ({
      where,
    }: {
      where: { id?: string; orgSourceAllocationId?: string };
    }) => {
      if (where.id) return this.allocations.get(where.id) ?? null;
      if (where.orgSourceAllocationId) {
        return (
          [...this.allocations.values()].find(
            (a) => a.orgSourceAllocationId === where.orgSourceAllocationId,
          ) ?? null
        );
      }
      throw new Error(
        `fake-prisma: unsupported transactionAllocation.findUnique where ${JSON.stringify(where)}`,
      );
    },
    findMany: async ({
      where,
      include,
    }: {
      where?: Row;
      include?: Row;
    }): Promise<Row[]> => {
      const rows = [...this.allocations.values()].filter((a) =>
        this.matchesTransactionWhere(a, where),
      );
      if (!include) return rows;
      // Only `listForTransaction` passes an include; it wants each endpoint
      // with its contact so the redaction rule can compare contactIds.
      const endpoint = (id: unknown) => {
        const tx = this.transactions.get(id as string);
        if (!tx) return null;
        return {
          ...tx,
          contact: this.contacts.get(tx.contactId as string) ?? null,
        };
      };
      return rows.map((row) => ({
        ...row,
        ...(include.sourceTransaction
          ? { sourceTransaction: endpoint(row.sourceTransactionId) }
          : {}),
        ...(include.targetTransaction
          ? { targetTransaction: endpoint(row.targetTransactionId) }
          : {}),
      }));
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.allocations.get(where.id);
      if (!row) throw new Error(`fake-prisma: no allocation ${where.id}`);
      Object.assign(row, data);
      return row;
    },
    updateMany: async ({ where, data }: { where?: Row; data: Row }) => {
      const rows = await this.transactionAllocation.findMany({ where });
      for (const row of rows) Object.assign(row, data);
      return { count: rows.length };
    },
    aggregate: async ({ where }: { where?: Row; _sum: { amount: true } }) => {
      const rows = await this.transactionAllocation.findMany({ where });
      const sum = rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      return { _sum: { amount: rows.length === 0 ? null : sum } };
    },
    groupBy: async ({ where, by }: { where?: Row; by: string[] }) => {
      const rows = await this.transactionAllocation.findMany({ where });
      const groups = new Map<string, { key: Row; sum: number }>();
      for (const row of rows) {
        const keyObj = Object.fromEntries(by.map((k) => [k, row[k]]));
        const key = JSON.stringify(keyObj);
        const existing = groups.get(key) ?? { key: keyObj, sum: 0 };
        existing.sum += Number(row.amount) || 0;
        groups.set(key, existing);
      }
      return [...groups.values()].map((g) => ({
        ...g.key,
        _sum: { amount: g.sum },
      }));
    },
  };

  organisationMember = {
    findUnique: async ({
      where,
    }: {
      where: { orgId_userId: { orgId: string; userId: string } };
    }) => {
      const { orgId, userId } = where.orgId_userId;
      return this.members.get(`${orgId}:${userId}`) ?? null;
    },
  };

  user = {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; email?: string };
    }) => {
      if (where.id) return this.users.get(where.id) ?? null;
      if (where.email) {
        return (
          [...this.users.values()].find((u) => u.email === where.email) ?? null
        );
      }
      return null;
    },
  };

  /** Audit rows, kept so specs can assert on what was written. */
  histories: Row[] = [];

  transactionHistory = {
    create: async ({ data }: { data: Row }) => {
      this.histories.push(data);
      return data;
    },
    createMany: async ({ data }: { data: Row[] }) => {
      this.histories.push(...data);
      return { count: data.length };
    },
  };
  witness = { updateMany: async () => ({ count: 0 }) };

  /**
   * The allocation path issues `SELECT ... FOR UPDATE` to serialise concurrent
   * passes. There is no concurrency in a fake, so the lock is a no-op — but the
   * call must not throw, or every allocation test fails on the lock line.
   */
  $queryRaw = async (): Promise<unknown[]> => [];

  private snapshot() {
    const clone = (m: Map<string, Row>) =>
      new Map([...m.entries()].map(([k, v]) => [k, { ...v }]));
    return {
      contacts: clone(this.contacts),
      transactions: clone(this.transactions),
      allocations: clone(this.allocations),
      histories: [...this.histories],
    };
  }

  /**
   * Rolls back on throw. Not a nicety: the all-or-nothing guarantee of a
   * multi-target allocation pass is only testable if a failure on the third
   * row actually undoes the first two.
   */
  $transaction = async <T>(arg: unknown): Promise<T> => {
    if (Array.isArray(arg)) return Promise.all(arg) as Promise<T>;
    const before = this.snapshot();
    try {
      return await (arg as (p: FakePrisma) => Promise<T>)(this);
    } catch (error) {
      this.contacts = before.contacts;
      this.transactions = before.transactions;
      this.allocations = before.allocations;
      this.histories = before.histories;
      throw error;
    }
  };

  seedUser(user: { id: string } & Row) {
    this.users.set(user.id, user);
  }

  seedOrgMembership(orgId: string, userId: string, role = 'OPERATOR') {
    this.members.set(`${orgId}:${userId}`, { orgId, userId, role });
  }
}
