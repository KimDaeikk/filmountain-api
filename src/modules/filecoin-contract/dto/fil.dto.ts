import { ApiProperty } from '@nestjs/swagger';

export class GetEthAddressDto {
    keyId: string;
}

export class DepositV0Dto {
    @ApiProperty({ example: '1c9097c4-4d63-433e-8ccc-226e40e51a8d' })
    keyId: string;
    amount: string;
}

export class WithdrawV0Dto {
    msigExecuteKeyId: string;
    msigSigningKeyId: string;
    msigTxIndex: string;
    fromEthAddress: string;
    toEthAddress: string;
    amount: string;
}

export class SetPoolDto {
    msigExecuteKeyId: string;
    msigSigningKeyId: string;
    poolAddress: string;
    msigTxIndex: string;
}