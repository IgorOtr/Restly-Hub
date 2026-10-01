import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { RedeployJobService } from './redeploy-job.service';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, RedeployJobService],
})
export class ClientsModule {}
