import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionAllocationsService } from './transaction-allocations.service';
import { TransactionsResolver } from './transactions.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';

@Module({
  imports: [NotificationsModule, ExchangeRateModule, InAppNotificationsModule],
  providers: [
    TransactionsResolver,
    TransactionsService,
    TransactionAllocationsService,
  ],
  exports: [TransactionsService, TransactionAllocationsService],
})
export class TransactionsModule {}
