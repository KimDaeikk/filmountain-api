import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags, ApiResponse } from '@nestjs/swagger';
import { FilecoinClientService } from './filecoin-client.service';

// import {
// 	DepositDto
// } from './dto/fil.dto';

@Controller('fvm')
@ApiTags('trigger transactions on fvm')
export class FilecoinClientController {
	constructor(private readonly filecoinClientService: FilecoinClientService) {}

	/**
	 * @description: Update maximum bid number on blockchain
	 */
	@Post('/deposit')
	@ApiBody({ type: DepositDto })
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
	async deposit(@Body() depositDto: DepositDto) {
		const { keyId } = depositDto;
		return await this.filecoinClientService.depositPoolV0(keyId);
	}

	// /**
	//  * @description: Update maximum bid number on blockchain
	//  */
	// @Get('/list-price')
	// async getListPrice() {
	// 	return await this.blockchainService.getListPrice();
	// }

	// /**
	//  * @description: Update maximum bid number on blockchain
	//  */
	// @Post('/list-price')
	// @ApiBody({ type: UpdateListPriceDto })
	// async updateListPrice(@Body() dto: UpdateListPriceDto) {
	// 	console.log(dto);

	// 	return await this.blockchainService.updateListPrice(dto);
	// }
}
