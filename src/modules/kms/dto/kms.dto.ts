import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class KeyGenerateDto {
    @ApiProperty({ example: '15879' })
    @IsNumber()
    userIndex: number;
}

export class KeyDeleteDto {
    @ApiProperty({ example: '1c9097c4-4d63-433e-8ccc-226e40e51a8d'})
    keyId: string;
}