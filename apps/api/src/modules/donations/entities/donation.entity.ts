import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { DonationStatus } from '../../../generated/prisma/client';
import { User } from '../../users/entities/user.entity';

registerEnumType(DonationStatus, {
  name: 'DonationStatus',
});

@ObjectType()
export class Donation {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  amount: number;

  @Field()
  currency: string;

  @Field(() => DonationStatus)
  status: DonationStatus;

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
export class DonationOption {
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
