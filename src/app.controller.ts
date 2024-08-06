import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { FilecoinClientService } from './modules/filecoin-client/filecoin-client.service';
import { FilecoinContractService } from './modules/filecoin-contract/filecoin-contract.service';
import { KmsService } from './modules/kms/kms.service';
import { MsgLookup } from './modules/filecoin-client/utils/types/types';
import { JustSendDto } from './dto/app.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller()
export class AppController {
	constructor(
		private readonly filecoinClientService: FilecoinClientService,
		private readonly filecoinContractService: FilecoinContractService,
		private readonly kmsService: KmsService,
	) {}

	@Post("just-send")
	@ApiBody({ type: JustSendDto })
	async justSend(@Body() justSendDto: JustSendDto) {
		const { keyId, to, value } = justSendDto
		const decodedTrimmedPublicKey = await this.kmsService.getPublicKey(keyId)
		const userF1Address = this.filecoinClientService.publicKeyToFilecoinAddress(decodedTrimmedPublicKey, "testnet")
		const sendMessagePartial = this.filecoinClientService.createBasicSendMessage(userF1Address, to, value)
		const messageObject = await this.filecoinClientService.createMessage(sendMessagePartial)
		const cidHash = this.kmsService.hashCidBytes(messageObject.message)
		const signature = await this.kmsService.signWithKMS(keyId, messageObject.message)
		const signatureObject = this.kmsService.decodeKMSSignature(signature)
		const result = await this.filecoinClientService.sendTransactionToLotus(signatureObject.r, signatureObject.s, messageObject.message)
		return result
	}
}
