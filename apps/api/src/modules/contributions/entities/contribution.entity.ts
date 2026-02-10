import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { ContributionStatus } from '../../../generated/prisma/client';
import { User } from '../../users/entities/user.entity';

registerEnumType(ContributionStatus, {
  name: 'ContributionStatus',
});

@ObjectType()
export class Contribution {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  amount: number;

  @Field()
  currency: string;

  @Field(() => ContributionStatus)
  status: ContributionStatus;

  @Field({ nullable: true })
  paymentProvider?: string;

  @Field({ nullable: true })
  paymentRef?: string;

  @Field({ nullable: true })
  donorId?: string;

  @Field({ nullable: true })
  donorName?: string;

  @Field({ nullable: true })
  donorEmail?: string;

  @Field({ nullable: true })
  message?: string;

  @Field()
  isAnonymous: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => User, { nullable: true })
  donor?: User;
}

@ObjectType()
export class ContributionOption {
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
