import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/auth.decorators';
import { SettingsService } from '../settings/settings.service';
import {
  CreateLeadDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
} from './dto/lead.dto';
import { LeadsService } from './leads.service';

/** Endpoints usados pelo site de vendas (sem login). */
@ApiTags('site')
@Public()
@Controller('public/site')
export class SitePublicController {
  constructor(
    private readonly leads: LeadsService,
    private readonly settings: SettingsService,
  ) {}

  /** Contato comercial exibido no site (WhatsApp/e-mail). */
  @Get('config')
  config() {
    return this.settings.salesContact();
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @HttpCode(200)
  @Post('leads')
  create(@Body() dto: CreateLeadDto, @Req() req: Request) {
    return this.leads.create(dto, {
      ip: req.ip?.replace(/^::ffff:/, ''),
      userAgent: req.headers['user-agent'],
    });
  }
}

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query() q: ListLeadsQueryDto) {
    return this.leads.list(q);
  }

  @Get('new-count')
  async newCount() {
    return { count: await this.leads.newCount() };
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }
}
