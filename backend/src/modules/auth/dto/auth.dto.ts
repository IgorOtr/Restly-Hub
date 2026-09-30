import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Trim } from '../../../common/validators/documents.validators';

const Lower = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export class LoginDto {
  @ApiProperty()
  @Lower()
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}

export class RegisterAdminDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(3, { message: 'Informe o nome completo' })
  @MaxLength(120)
  name: string;

  @ApiProperty()
  @Lower()
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  @MaxLength(128)
  password: string;
}
