import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { Donation, DonationOption } from './entities/donation.entity';
import { CreateDonationInput } from './dto/create-donation.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CheckoutSession } from '../subscription/entities/subscription.entity';

@Resolver(() => Donation)
export class DonationsResolver {
  constructor(private readonly donationsService: DonationsService) {}

  @Mutation(() => Donation)
  createDonation(
    @Args('createDonationInput') createDonationInput: CreateDonationInput,
    @CurrentUser() user?: User,
  ) {
    return this.donationsService.create(createDonationInput, user?.id);
  }

  @Query(() => [DonationOption], { name: 'donationOptions' })
  async getDonationOptions(): Promise<DonationOption[]> {
    return this.donationsService.getDonationOptions();
  }

  @Mutation(() => CheckoutSession, { name: 'createDonationSession' })
  @UseGuards(GqlAuthGuard)
  async createDonationSession(
    @Args('amount', { type: () => Number }) amount: number,
    @Args('currency', { type: () => String }) currency: string,
    @CurrentUser() user: User,
  ): Promise<CheckoutSession> {
    // Placeholder for Stripe/Paystack integration
    return {
      url: `https://checkout.example.com/donate?amount=${amount}&currency=${currency}&user=${user.id}`,
      sessionId: 'placeholder_donation_id',
    };
  }

  @Query(() => [Donation], { name: 'donations' })
  findAll() {
    return this.donationsService.findAll();
  }

  @Query(() => [Donation], { name: 'myDonations' })
  @UseGuards(GqlAuthGuard)
  findMyDonations(@CurrentUser() user: User) {
    return this.donationsService.findByDonor(user.id);
  }

  @Query(() => Donation, { name: 'donation' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.donationsService.findOne(id);
  }
}
