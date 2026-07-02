import { NotFoundException, ForbiddenException } from '@nestjs/common';

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
