import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionSummaryService } from './transaction-summary.service';
import { TransactionSettlementService } from './transaction-settlement.service';
import { TransactionAllocationsService } from './transaction-allocations.service';
import { TransactionsResolver } from './transactions.resolver';
import { TransactionAllocationsResolver } from './transaction-allocations.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { WitnessesModule } from '../witnesses/witnesses.module';

@Module({
  imports: [
    NotificationsModule,
    ExchangeRateModule,
    InAppNotificationsModule,
    WitnessesModule,
  ],
  providers: [
    TransactionsResolver,
    TransactionAllocationsResolver,
    TransactionsService,
    TransactionSummaryService,
    TransactionSettlementService,
    TransactionAllocationsService,
  ],
  exports: [TransactionsService, TransactionAllocationsService],
})
export class TransactionsModule {}
