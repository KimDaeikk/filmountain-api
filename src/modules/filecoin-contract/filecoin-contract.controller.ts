import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags, ApiResponse } from '@nestjs/swagger';
import { FilecoinContractService } from './filecoin-contract.service';

import {
	DepositV0Dto,
	GetEthAddressDto,
	SetPoolDto,
	WithdrawV0Dto
} from './dto/fil.dto';

@Controller('fevm')
@ApiTags('trigger transactions on fvm')
export class FilecoinContractController {
	constructor(private readonly filecoinContractService: FilecoinContractService) {}

	// -=-=-=-=-=-=-=-=-=-=-=- Utility -=-=-=-=-=-=-=-=-=-=-=-
	@Post('/get-eth-address')
	async getEthAddress(@Body() getEthAddressDto: GetEthAddressDto) {
		const { keyId } = getEthAddressDto;
		return await this.filecoinContractService.getEthAddress(keyId)
	}
	
	// -=-=-=-=-=-=-=-=-=-=-=- Filmountain USER TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-
	@Post('/deposit-v0')
	@ApiBody({ type: DepositV0Dto })
    @ApiResponse({
        status: 201,
        description: 'Private key created successfully',
        schema: {
            example: {
                message: 'Private key created successfully',
                keyId: '1c9097c4-4d63-433e-8ccc-216a44e01a8d',
            }
        },
    })
	async depositV0(@Body() depositDto: DepositV0Dto) {
		const { keyId, amount } = depositDto;
		return await this.filecoinContractService.depositPoolV0(keyId, amount);
	}

	// -=-=-=-=-=-=-=-=-=-=-=- Filmountain ADMIN TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-
	// -=-=- ADDRESS REGISTRY -=-=-
	@Post('/addr-reg-set-pool')
	@ApiBody({ type: SetPoolDto })
	async setPool(@Body() setPoolDto: SetPoolDto) {
		const { msigExecuteKeyId, msigSigningKeyId, poolAddress, msigTxIndex } = setPoolDto
		const { 
			poolV0Address,
			contractArguments
		} = await this.filecoinContractService.getAddressRegistrySetPoolSignature(msigSigningKeyId, poolAddress);
		await this.filecoinContractService.submitTransaction(msigExecuteKeyId, poolV0Address, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, msigTxIndex, "0");
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, msigTxIndex, "0");	
	}

	// -=-=- USER REGISTRY -=-=-

	// -=-=- POOL V0 -=-=-
	@Post('/pool-v0-withdraw')
	@ApiBody({ type: SetPoolDto })
	async withdrawV0(@Body() withdrawDto: WithdrawV0Dto) {
		const { msigExecuteKeyId, msigSigningKeyId, msigTxIndex, fromEthAddress, toEthAddress, amount } = withdrawDto
		const { 
			poolV0Address,
			contractArguments
		} = await this.filecoinContractService.getPoolV0WithdrawSignature(msigSigningKeyId, fromEthAddress, toEthAddress, amount);
		await this.filecoinContractService.submitTransaction(msigExecuteKeyId, poolV0Address, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, msigTxIndex, "0");
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, msigTxIndex, "0");	
	}

	// -=-=- SP VAULT V0 -=-=-
}
