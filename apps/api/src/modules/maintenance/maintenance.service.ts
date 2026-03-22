import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MaintenanceService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Remove stale repeatable jobs before re-registering (deduplication)
    const existing = await this.maintenanceQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.maintenanceQueue.removeRepeatableByKey(job.key);
    }

    await this.maintenanceQueue.add(
      'exchange-rate-update',
      {},
      { repeat: { pattern: '0 */2 * * *' } },
    );

    await this.maintenanceQueue.add(
      'check-provisioning-expiry',
      {},
      { repeat: { pattern: '0 0 * * *' } },
    );

    // Trigger an immediate exchange rate update on startup
    await this.maintenanceQueue.add(
      'exchange-rate-update',
      {},
      { jobId: `boot-exchange-rate-${Date.now()}` },
    );

    this.logger.log(
      'Maintenance jobs registered (exchange-rate: */2h, expiry: midnight)',
    );
  }
}
