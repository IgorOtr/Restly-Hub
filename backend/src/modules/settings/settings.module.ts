import { Global, Module } from '@nestjs/common';
import { SigningService } from '../signing/signing.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SigningService],
  exports: [SettingsService, SigningService],
})
export class SettingsModule {}
