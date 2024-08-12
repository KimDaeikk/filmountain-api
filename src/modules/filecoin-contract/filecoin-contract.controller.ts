import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags, ApiResponse } from '@nestjs/swagger';
import { FilecoinContractService } from './filecoin-contract.service';

import {
	DepositV0Dto,
	GetEthAddressDto,
	MsigTransferDto,
	PayPrincipalV0Dto,
	SetAddressDto,
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

	@Post('/msig-transfer')
	async multiSigTransfer(@Body() msigTransferDto: MsigTransferDto) {
		const { msigExecuteKeyId, msigSigningKeyId, toAddress, amount } = msigTransferDto;
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, toAddress, amount, "0x");
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, amount);
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
	@ApiBody({ type: SetAddressDto })
	async setPool(@Body() setAddressDto: SetAddressDto) {
		const { msigExecuteKeyId, msigSigningKeyId, address } = setAddressDto
		const {
			addressRegistryAddress,
			contractArguments
		} = await this.filecoinContractService.getAddressRegistrySetPoolSignature(msigSigningKeyId, address);
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, addressRegistryAddress, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, "0");
	}

	@Post('/addr-reg-set-vault')
	@ApiBody({ type: SetAddressDto })
	async setVault(@Body() setAddressDto: SetAddressDto) {
		const { msigExecuteKeyId, msigSigningKeyId, address } = setAddressDto
		const { 
			addressRegistryAddress,
			contractArguments
		} = await this.filecoinContractService.getAddressRegistrySetPoolSignature(msigSigningKeyId, address);
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, addressRegistryAddress, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, "0");
	}

	@Post('/addr-reg-set-zc')
	@ApiBody({ type: SetAddressDto })
	async setZC(@Body() setAddressDto: SetAddressDto) {
		const { msigExecuteKeyId, msigSigningKeyId, address } = setAddressDto
		const { 
			addressRegistryAddress,
			contractArguments
		} = await this.filecoinContractService.getAddressRegistrySetPoolSignature(msigSigningKeyId, address);
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, addressRegistryAddress, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, "0");
	}

	// -=-=- USER REGISTRY -=-=-
	async addUser(@Body() setAddressDto: SetAddressDto) {
		const { msigExecuteKeyId, msigSigningKeyId, address } = setAddressDto
		const {
			userRegistryAddress,
			contractArguments
		} = await this.filecoinContractService.getUserRegistryAddUserSignature(msigSigningKeyId, address)
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, userRegistryAddress, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, "0");
	}

	async removeUser(@Body() setAddressDto: SetAddressDto) {
		const { msigExecuteKeyId, msigSigningKeyId, address } = setAddressDto
		const {
			userRegistryAddress,
			contractArguments
		} = await this.filecoinContractService.getUserRegistryRemoveUserSignature(msigSigningKeyId, address)
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, userRegistryAddress, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, "0");
	}

	// -=-=- POOL V0 -=-=-
	@Post('/pool-v0-withdraw')
	@ApiBody({ type: WithdrawV0Dto })
	async withdrawV0(@Body() withdrawDto: WithdrawV0Dto) {
		const { msigExecuteKeyId, msigSigningKeyId, fromEthAddress, toEthAddress, amount } = withdrawDto
		const { 
			poolV0Address,
			contractArguments
		} = await this.filecoinContractService.getPoolV0WithdrawSignature(msigSigningKeyId, fromEthAddress, toEthAddress, amount);
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, poolV0Address, "0", contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, "0");	
	}

	@Post('/pool-v0-pay-principal')
	@ApiBody({ type: PayPrincipalV0Dto })
	async payPrincipalV0(@Body() payPrincipalV0Dto: PayPrincipalV0Dto) {
		const { msigExecuteKeyId, msigSigningKeyId, toAddress, amount } = payPrincipalV0Dto
		const { 
			poolV0Address,
			contractArguments
		} = await this.filecoinContractService.getPoolV0PayPrincipalSignature(msigSigningKeyId, toAddress);
		const transactionIndex = await this.filecoinContractService.submitTransaction(msigExecuteKeyId, poolV0Address, amount, contractArguments);
		await this.filecoinContractService.confirmTransaction(msigSigningKeyId, transactionIndex);
		await this.filecoinContractService.executeTransaction(msigExecuteKeyId, transactionIndex, amount);	
	}

	// -=-=- SP VAULT V0 -=-=-
	async payInterestV0() {

	}

	async pushFund() {
		
	}

}
