import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';
import { ClientIp, Public } from '../../common/decorators/auth.decorators';
import { extractBearer } from '../../common/guards/jwt-auth.guard';
import { LicensesService } from './licenses.service';

class LicenseCheckDto {
  @Matches(/^[a-z0-9-]{1,60}$/)
  instanceId: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  nonce: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string | null;

  /** A instalação ainda não tem administrador cadastrado. */
  @IsOptional()
  @IsBoolean()
  needsSetup?: boolean;
}

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licenses: LicensesService) {}

  /**
   * Consulta de licença feita por cada instalação. Autenticada pela chave da
   * instalação (Bearer) e respondida com payload assinado.
   */
  @Public()
  // Várias instalações podem compartilhar o mesmo servidor (mesmo IP).
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @HttpCode(200)
  @Post('check')
  check(
    @Body() dto: LicenseCheckDto,
    @Req() req: Request,
    @ClientIp() ip: string,
  ) {
    return this.licenses.check({ ...dto, key: extractBearer(req), ip });
  }
}
