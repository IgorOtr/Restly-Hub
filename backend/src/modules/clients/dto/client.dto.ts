import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LicenseStatus } from '#prisma-client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Digits, Trim } from '../../../common/validators/documents.validators';
import { LICENSE_REASONS } from '../license-messages';

const Lower = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
const NullIfEmpty = () =>
  Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : null,
  );
const EmptyToUndefined = () =>
  Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  );

export class CreateClientDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'Informe o nome do cliente' })
  @MaxLength(160)
  name: string;

  @ApiProperty({ description: 'Identificador da instalação / subdomínio' })
  @Lower()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/, {
    message: 'Use apenas letras minúsculas, números e hífen',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Cria a instalação automaticamente no servidor (via agente)',
  })
  @IsOptional()
  @IsBoolean()
  provision?: boolean;

  @ApiProperty({
    example: 'https://terragaucha.restly.com.br',
    description:
      'Dispensado quando provision = true (o endereço é definido pelo servidor)',
  })
  @ValidateIf((o: CreateClientDto) => !o.provision)
  @Trim()
  @IsUrl(
    {
      require_protocol: true,
      require_tld: false,
      protocols: ['http', 'https'],
    },
    { message: 'Endereço da instalação inválido' },
  )
  @MaxLength(255)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @EmptyToUndefined()
  @Digits()
  @Matches(/^(\d{11}|\d{14})$/, { message: 'CPF/CNPJ inválido' })
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @EmptyToUndefined()
  @Digits()
  @Matches(/^\d{10,13}$/, { message: 'Telefone inválido' })
  ownerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @EmptyToUndefined()
  @Lower()
  @IsEmail({}, { message: 'E-mail inválido' })
  ownerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999)
  monthlyFee?: number;

  // Contato de suporte específico deste cliente (vazio = contato geral do Hub).
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @NullIfEmpty()
  @IsString()
  @MaxLength(120)
  supportName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') || null : null,
  )
  @Matches(/^\d{10,13}$/, { message: 'Telefone de suporte inválido' })
  supportPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @NullIfEmpty()
  @IsEmail({}, { message: 'E-mail de suporte inválido' })
  supportEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @NullIfEmpty()
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'Link de suporte inválido' },
  )
  @MaxLength(500)
  supportUrl?: string | null;

  @ApiPropertyOptional({ description: 'Dia do vencimento (1–31)' })
  @IsOptional()
  @ValidateIf((o: CreateClientDto) => o.dueDay !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number | null;
}

export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['provision'] as const),
) {}

export class SetLicenseDto {
  @ApiProperty({ enum: LicenseStatus })
  @IsEnum(LicenseStatus)
  status: LicenseStatus;

  @ApiPropertyOptional({ enum: LICENSE_REASONS })
  @IsOptional()
  @IsIn(LICENSE_REASONS)
  reason?: (typeof LICENSE_REASONS)[number];

  @ApiPropertyOptional({
    description:
      'Mensagem exibida ao cliente (vazio = mensagem padrão do motivo)',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({
    description: 'Prazo para regularização (YYYY-MM-DD), usado no aviso',
  })
  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  dueDate?: string;
}

export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: LicenseStatus })
  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;

  @ApiPropertyOptional({ description: 'true = encerrados' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  archived?: boolean;
}
