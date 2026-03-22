import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsEnum } from 'class-validator';
import { UserRole } from '../../../generated/prisma/client';

@InputType()
export class SetUserRoleInput {
  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role: UserRole;
}
