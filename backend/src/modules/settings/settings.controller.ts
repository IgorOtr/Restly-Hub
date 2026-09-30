import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { SigningService } from '../signing/signing.service';
import { SettingsService } from './settings.service';

const Clean = () =>
  Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : null,
  );

class SupportContactDto {
  @IsOptional()
  @Clean()
  @IsString()
  @MaxLength(120)
  name: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') || null : null,
  )
  @Matches(/^\d{10,13}$/, { message: 'Telefone inválido' })
  phone: string | null;

  @IsOptional()
  @Clean()
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string | null;

  @IsOptional()
  @Clean()
  @IsUrl(
    { require_protocol: true, protocols: ['https', 'http'] },
    { message: 'Link inválido' },
  )
  @MaxLength(500)
  url: string | null;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly signing: SigningService,
    private readonly config: ConfigService,
    private readonly provisioning: ProvisioningService,
  ) {}

  @Get()
  async get() {
    return {
      supportContact: await this.settings.supportContact(),
      // Dados usados para configurar cada instalação (variáveis LICENSE_*).
      hubPublicKey: this.signing.publicKey(),
      hubPublicUrl: this.config.get<string>('HUB_PUBLIC_URL') ?? null,
      // Criação automática de instalações (null = agente não configurado/indisponível).
      provisioning: await this.provisioning.health(),
    };
  }

  @Put('support-contact')
  setSupportContact(@Body() dto: SupportContactDto) {
    return this.settings.setSupportContact({
      name: dto.name ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      url: dto.url ?? null,
    });
  }
}
