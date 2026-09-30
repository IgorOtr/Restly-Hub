import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type HubAuthUser,
} from '../../common/decorators/auth.decorators';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  ListClientsQueryDto,
  SetLicenseDto,
  UpdateClientDto,
} from './dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(@Query() q: ListClientsQueryDto) {
    return this.clients.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.get(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: HubAuthUser) {
    return this.clients.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Put(':id/license')
  setLicense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetLicenseDto,
    @CurrentUser() user: HubAuthUser,
  ) {
    return this.clients.setLicense(id, dto, user.id);
  }

  /** Cria (ou tenta criar novamente) a instalação no servidor. */
  @HttpCode(200)
  @Post(':id/provision')
  provision(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.provision(id);
  }

  @HttpCode(200)
  @Post(':id/instance/:action')
  instanceAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action', new ParseEnumPipe(['start', 'stop', 'redeploy']))
    action: 'start' | 'stop' | 'redeploy',
  ) {
    return this.clients.instanceAction(id, action);
  }

  @HttpCode(200)
  @Post(':id/sync')
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.sync(id);
  }

  @Post(':id/regenerate-key')
  regenerateKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.regenerateKey(id);
  }

  @HttpCode(200)
  @Post(':id/archive')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: HubAuthUser,
  ) {
    return this.clients.archive(id, user.id);
  }

  @HttpCode(200)
  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.restore(id);
  }
}
