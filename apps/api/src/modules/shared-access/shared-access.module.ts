import { Module } from '@nestjs/common';
import { SharedAccessService } from './shared-access.service';
import { SharedAccessResolver } from './shared-access.resolver';
import { NotificationsModule } from '../../modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [SharedAccessResolver, SharedAccessService],
})
export class SharedAccessModule {}
