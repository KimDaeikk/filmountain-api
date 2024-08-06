import { ApiProperty } from "@nestjs/swagger";

export class JustSendDto {
    @ApiProperty({ example: '1c9097c4-4d63-433e-8ccc-226e40e51a8d' })
    keyId: string;
    to: string;
    value: string;
}