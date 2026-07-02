import { NotFoundException, ForbiddenException } from '@nestjs/common';

/**
 * Shared find-then-verify-ownership guard: fetches via `finder`, throws
 * NotFoundException if nothing comes back, ForbiddenException if the
 * fetched entity's `ownerField` doesn't match `expectedOwnerValue`.
 */
export async function assertOwnership<T extends Record<string, unknown>>(
  finder: () => Promise<T | null>,
  ownerField: keyof T,
  expectedOwnerValue: unknown,
  notFoundMessage: string,
  forbiddenMessage: string,
): Promise<void> {
  const entity = await finder();
  if (!entity) {
    throw new NotFoundException(notFoundMessage);
  }
  if (entity[ownerField] !== expectedOwnerValue) {
    throw new ForbiddenException(forbiddenMessage);
  }
}
