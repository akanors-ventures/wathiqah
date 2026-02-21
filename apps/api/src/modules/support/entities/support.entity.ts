import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { SupportStatus } from '../../../generated/prisma/client';
import { User } from '../../users/entities/user.entity';

registerEnumType(SupportStatus, {
  name: 'SupportStatus',
});

@ObjectType()
export class Support {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  amount: number;

  @Field()
  currency: string;

  @Field(() => SupportStatus)
  status: SupportStatus;

  @Field({ nullable: true })
  paymentProvider?: string;

  @Field({ nullable: true })
  paymentRef?: string;

  @Field({ nullable: true })
  supporterId?: string;

  @Field({ nullable: true })
  supporterName?: string;

  @Field({ nullable: true })
  supporterEmail?: string;

  @Field({ nullable: true })
  message?: string;

  @Field()
  isAnonymous: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => User, { nullable: true })
  supporter?: User;
}

@ObjectType()
export class SupportOption {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  amount: number;

  @Field()
  label: string;

  @Field()
  currency: string;

  @Field({ nullable: true })
  description?: string;
}
