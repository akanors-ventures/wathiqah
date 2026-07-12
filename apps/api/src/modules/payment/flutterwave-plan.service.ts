import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanStatus, SubscriptionTier } from '../../generated/prisma/enums';
import { Plan, Prisma } from '../../generated/prisma/client';

// Shape of a row returned by Flutterwave's Payment Plan API — only the
// fields this service actually reads.
// https://developer.flutterwave.com/v3.0.0/reference/create-payment-plan-1
interface FlutterwavePaymentPlan {
  id: number | string;
  name: string;
  amount: number;
  interval: string;
  currency?: string;
  status?: string;
}

export interface CreatePlanInput {
  tier: SubscriptionTier;
  interval: string; // Flutterwave's raw interval: yearly | quarterly | monthly | weekly | daily
  currency: string;
  amount: number;
  name: string;
  duration?: number;
}

export interface UpdatePlanInput {
  name?: string;
  status?: PlanStatus;
  tier?: SubscriptionTier | null;
}

const FLUTTERWAVE_TO_LOCAL_STATUS: Record<string, PlanStatus> = {
  active: PlanStatus.ACTIVE,
  inactive: PlanStatus.INACTIVE,
  cancelled: PlanStatus.CANCELLED,
};

/**
 * Wraps Flutterwave's Payment Plan API (the recurring-billing templates
 * shown on the Flutterwave dashboard, distinct from a user's individual
 * Subscription) and keeps the local `Plan` table — the single source of
 * truth `createSubscriptionSession` and admin console read from — in sync
 * with whatever exists on Flutterwave.
 */
@Injectable()
export class FlutterwavePlanService {
  private readonly logger = new Logger(FlutterwavePlanService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.configService.get<string>(
        'payment.flutterwave.secretKey',
      )}`,
      'Content-Type': 'application/json',
    };
  }

  private toLocalStatus(status?: string): PlanStatus {
    return (
      FLUTTERWAVE_TO_LOCAL_STATUS[status?.toLowerCase() ?? ''] ??
      PlanStatus.ACTIVE
    );
  }

  private async upsertLocalPlan(
    remote: FlutterwavePaymentPlan,
    overrides?: { tier?: SubscriptionTier | null; createdById?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Plan> {
    const prisma = tx ?? this.prisma;
    const providerPlanId = String(remote.id);
    const data: Prisma.PlanUpsertArgs['create'] = {
      providerPlanId,
      name: remote.name,
      amount: new Prisma.Decimal(remote.amount),
      interval: remote.interval,
      currency: (remote.currency ?? 'NGN').toUpperCase(),
      status: this.toLocalStatus(remote.status),
      provider: 'flutterwave',
      ...(overrides?.tier !== undefined && { tier: overrides.tier }),
      ...(overrides?.createdById && { createdById: overrides.createdById }),
    };

    return prisma.plan.upsert({
      where: { providerPlanId },
      create: data,
      update: {
        name: data.name,
        amount: data.amount,
        interval: data.interval,
        currency: data.currency,
        status: data.status,
        ...(overrides?.tier !== undefined && { tier: overrides.tier }),
      },
    });
  }

  // tx is optional so callers that need to write an audit-log row atomically
  // with the local plan change (e.g. AdminService) can pass one in — the
  // Flutterwave API call itself always happens outside any transaction,
  // since holding a DB transaction open across a network call is unsafe.
  async createPlan(
    input: CreatePlanInput,
    createdById: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Plan> {
    let response: { data: { data: FlutterwavePaymentPlan } };
    try {
      response = await axios.post(
        'https://api.flutterwave.com/v3/payment-plans',
        {
          amount: input.amount,
          name: input.name,
          interval: input.interval,
          ...(input.duration != null && { duration: input.duration }),
        },
        { headers: this.getAuthHeaders() },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create Flutterwave payment plan: ${error.message}`,
      );
      throw new Error('Could not create payment plan with Flutterwave');
    }

    return this.upsertLocalPlan(
      { ...response.data.data, currency: input.currency },
      { tier: input.tier, createdById },
      tx,
    );
  }

  async updatePlan(
    planId: string,
    input: UpdatePlanInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Plan> {
    const prisma = tx ?? this.prisma;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    const nextName = input.name ?? plan.name;
    const nextStatus = input.status ?? plan.status;

    // Flutterwave's update endpoint requires both name and status on every
    // call — merge with the current values so a partial local edit (e.g.
    // just the tier) doesn't unintentionally revert the other field.
    if (input.name !== undefined || input.status !== undefined) {
      try {
        await axios.put(
          `https://api.flutterwave.com/v3/payment-plans/${plan.providerPlanId}`,
          { name: nextName, status: nextStatus.toLowerCase() },
          { headers: this.getAuthHeaders() },
        );
      } catch (error) {
        this.logger.error(
          `Failed to update Flutterwave payment plan ${plan.providerPlanId}: ${error.message}`,
        );
        throw new Error('Could not update payment plan with Flutterwave');
      }
    }

    return prisma.plan.update({
      where: { id: planId },
      data: {
        name: nextName,
        status: nextStatus,
        ...(input.tier !== undefined && { tier: input.tier }),
      },
    });
  }

  async cancelPlan(
    planId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Plan> {
    const prisma = tx ?? this.prisma;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    try {
      await axios.put(
        `https://api.flutterwave.com/v3/payment-plans/${plan.providerPlanId}/cancel`,
        {},
        { headers: this.getAuthHeaders() },
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel Flutterwave payment plan ${plan.providerPlanId}: ${error.message}`,
      );
      throw new Error('Could not cancel payment plan with Flutterwave');
    }

    return prisma.plan.update({
      where: { id: planId },
      data: { status: PlanStatus.CANCELLED },
    });
  }

  /**
   * Pulls every payment plan from Flutterwave and upserts it locally by
   * providerPlanId — how plans already created directly on the Flutterwave
   * dashboard (rather than through this service) get imported. Existing
   * local rows keep their `tier` assignment; only Flutterwave-owned fields
   * (name/amount/interval/currency/status) are overwritten.
   */
  async syncFromFlutterwave(): Promise<Plan[]> {
    const synced: Plan[] = [];
    let page = 1;
    const maxPages = 20; // backstop against a runaway loop, not a real cap

    while (page <= maxPages) {
      let response: { data: { data: FlutterwavePaymentPlan[] } };
      try {
        response = await axios.get(
          'https://api.flutterwave.com/v3/payment-plans',
          { params: { page }, headers: this.getAuthHeaders() },
        );
      } catch (error) {
        this.logger.error(
          `Failed to list Flutterwave payment plans (page ${page}): ${error.message}`,
        );
        throw new Error('Could not sync payment plans from Flutterwave');
      }

      const plans = response.data?.data ?? [];
      if (plans.length === 0) break;

      for (const remote of plans) {
        synced.push(await this.upsertLocalPlan(remote));
      }

      page += 1;
    }

    return synced;
  }

  async getLocalPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
