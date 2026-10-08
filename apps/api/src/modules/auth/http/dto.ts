import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

import { ROLES, type Role } from '../../../common/auth/auth-user';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({
    description: 'E-mail (bez rozróżniania wielkości liter)',
    example: 'jan.nowak@example.com',
    maxLength: 254,
  })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ description: 'Hasło', example: 'Haslo-demo-123', minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  password: string;
}

export class MeDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'jan.nowak@example.com' })
  email: string;

  @ApiProperty({ example: 'Jan' })
  firstName: string;

  @ApiProperty({ example: 'Nowak' })
  lastName: string;

  @ApiProperty({ enum: ROLES, enumName: 'Role', example: 'OWNER' })
  role: Role;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT do nagłówka `Authorization: Bearer …` (trzymany tylko w pamięci SPA)',
  })
  accessToken: string;

  @ApiProperty({ description: 'Czas życia access tokenu w sekundach', example: 900 })
  expiresIn: number;

  @ApiProperty({ type: MeDto })
  user: MeDto;
}
