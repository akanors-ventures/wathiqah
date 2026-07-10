import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationInput, getPrismaSkip } from './pagination.input';

describe('PaginationInput validation', () => {
  it('passes with no fields set (defaults apply at the GraphQL layer)', async () => {
    const errors = await validate(plainToInstance(PaginationInput, {}));
    expect(errors).toHaveLength(0);
  });

  it('passes with valid page and limit', async () => {
    const errors = await validate(
      plainToInstance(PaginationInput, { page: 2, limit: 50 }),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects page: 0 instead of silently falling through to a negative skip', async () => {
    const errors = await validate(
      plainToInstance(PaginationInput, { page: 0 }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('page');
  });

  it('rejects a negative page', async () => {
    const errors = await validate(
      plainToInstance(PaginationInput, { page: -1 }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('page');
  });

  it('rejects a negative limit instead of silently reversing sort order', async () => {
    const errors = await validate(
      plainToInstance(PaginationInput, { limit: -20 }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
  });

  it('rejects a limit above the 100 cap', async () => {
    const errors = await validate(
      plainToInstance(PaginationInput, { limit: 1000 }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
  });
});

describe('getPrismaSkip', () => {
  it('computes skip from page and limit', () => {
    expect(getPrismaSkip(1, 25)).toBe(0);
    expect(getPrismaSkip(2, 25)).toBe(25);
    expect(getPrismaSkip(3, 10)).toBe(20);
  });
});
