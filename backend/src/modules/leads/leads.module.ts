import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { LeadsController, SitePublicController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [SettingsModule],
  controllers: [SitePublicController, LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
