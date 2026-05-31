import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '../../../generated/prisma/client';

@InputType()
export class InviteMemberInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field(() => OrgRole)
  @IsEnum(OrgRole)
  role: OrgRole;
}
