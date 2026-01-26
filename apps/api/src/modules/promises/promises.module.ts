import { Module } from '@nestjs/common';
import { PromisesService } from './promises.service';
import { PromisesResolver } from './promises.resolver';

@Module({
  providers: [PromisesResolver, PromisesService],
})
export class PromisesModule {}
