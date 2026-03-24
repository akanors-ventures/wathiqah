import { InputType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { ProjectStatus } from '../../../generated/prisma/enums';

export enum ProjectBalanceStanding {
  ALL = 'ALL',
  UNDER_BUDGET = 'UNDER_BUDGET',
  OVER_BUDGET = 'OVER_BUDGET',
}

registerEnumType(ProjectBalanceStanding, { name: 'ProjectBalanceStanding' });

@InputType()
export class FilterProjectInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => ProjectStatus, { nullable: true })
  status?: ProjectStatus;

  @Field(() => ProjectBalanceStanding, { nullable: true })
  balanceStanding?: ProjectBalanceStanding;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
