import { Global, Module } from '@nestjs/common';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { SigningService } from '../signing/signing.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SigningService, ProvisioningService],
  exports: [SettingsService, SigningService, ProvisioningService],
})
export class SettingsModule {}
