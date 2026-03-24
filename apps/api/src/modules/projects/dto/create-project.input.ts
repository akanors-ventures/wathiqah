import { InputType, Field, Float } from '@nestjs/graphql';
import { ProjectStatus } from '../../../generated/prisma/enums';

@InputType()
export class CreateProjectInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field({ nullable: true })
  currency?: string;

  @Field(() => ProjectStatus, { nullable: true, defaultValue: ProjectStatus.ACTIVE })
  status?: ProjectStatus;
}
