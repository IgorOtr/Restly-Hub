import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LeadStatus } from '#prisma-client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
  Digits,
  IsPhoneBR,
  Trim,
} from '../../../common/validators/documents.validators';

export const TABLE_RANGES = ['1-10', '11-20', '21-40', '41+'] as const;

const EmptyToUndefined = () =>
  Transform(({ value }: { value: unknown }) =>
    value === '' || value === null ? undefined : value,
  );

/** Pedido de orçamento enviado pelo site (endpoint público). */
export class CreateLeadDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'Informe seu nome' })
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'WhatsApp com DDD' })
  @Digits()
  @IsPhoneBR({ message: 'Informe um WhatsApp válido com DDD' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @EmptyToUndefined()
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160)
  email?: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'Informe o nome do restaurante' })
  @MaxLength(160)
  restaurantName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ enum: TABLE_RANGES })
  @IsOptional()
  @EmptyToUndefined()
  @IsIn(TABLE_RANGES)
  tablesRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiProperty({ description: 'Consentimento para contato (LGPD)' })
  @IsBoolean()
  consent: boolean;

  /** Armadilha para robôs: campo oculto que precisa vir vazio. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class ListLeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
