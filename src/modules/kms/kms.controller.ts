import { UsePipes, ValidationPipe, Body, Controller, Get, Post, NotFoundException, ConflictException  } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KmsService } from './kms.service';
import {
    KeyGenerateDto,
    KeyDeleteDto,
    KeyGetDto,
} from './dto/kms.dto';

@Controller('kms')
@ApiTags('AWS Key Management Service')
export class KmsController {
    constructor(private readonly kmsService: KmsService) {}

    // TODO API 호출 최소화해야함(10,000API call $0.25)
    @Post('/generate-key')
    @ApiBody({ type: KeyGenerateDto })
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
    @UsePipes(new ValidationPipe())
	async generateKey(@Body() keyGenerateDto: KeyGenerateDto) {
        // API CALL 3회
        const { userIndex } = keyGenerateDto;
        try {
            const keyMetadata = await this.kmsService.findKeyByAlias(String(userIndex));
            if (keyMetadata !== null) {
                throw new ConflictException(`private key already exists: ${userIndex}`);
            }
            const keyId = await this.kmsService.generateKey();
            await this.kmsService.createAlias(String(userIndex), keyId)
            return { 
                message: 'Private key created successfully',
                keyId: keyId
            };
        } catch (error) {
            throw error
        }
    }

    @Post('/delete-key')
    @ApiBody({ type: KeyDeleteDto })
    @ApiResponse({
        status: 201,
        description: "The key is scheduled to be deleted in one week",
        schema: {
            example: {
                "message": "The key is scheduled to be deleted in one week",
                "response": {
                    "$metadata": {
                        "httpStatusCode": 200,
                        "requestId": "9dc79725-c961-4feb-8520-3444e1d69e9c",
                        "attempts": 1,
                        "totalRetryDelay": 0
                    },
                    "DeletionDate": "2024-08-09T11:10:52.362Z",
                    "KeyId": "arn:aws:kms:ap-northeast-2:058264374322:key/1c9097c4-4d63-433e-8ccc-216a44e01a8d",
                    "KeyState": "PendingDeletion",
                    "PendingWindowInDays": 7
                }
            }
        }
    })
    @UsePipes(new ValidationPipe())
    async deleteKey(@Body() keyDeleteDto: KeyDeleteDto) {
        // API CALL 1회
        const { keyId } = keyDeleteDto;
        try {
            const response = await this.kmsService.scheduleKeyDeletion(keyId)
            return {
                message: "The key is scheduled to be deleted in one week",
                response: response
            }
        } catch (error) {
            throw error
        }
    }

    @Post('/get-address')
    @ApiBody({ type: KeyGetDto })
    @ApiResponse({
        status: 201,
        description: "Get f1 address from key id",
        schema: {
            example: {
                "message": "Get f1 address successfully",
                "response": {
                    "f1Address": "t1mcgzh5xgzi6ry3mc2cwzibhxfv6zw2iv2er1jhc"
                }
            }
        }
    })
    async getF1Address(@Body() keyGetDto: KeyGetDto) {
        const { keyId } = keyGetDto;
        try {
            const derPublicKey = await this.kmsService.getPublicKey(keyId)
            return {
                message: "Get  successfully",
                response: {
                    publicKey: derPublicKey
                }
            }
        } catch (error) {
            throw error
        }
    }
    // async getF1Address(@Body() keyGetDto: KeyGetDto) {
    //     const { keyId } = keyGetDto;
    //     try {
    //         const derPublicKey = await this.kmsService.getPublicKey(keyId)
    //         const f1Address = this.filecoinClient.address.publicKeyToFilecoinAddress(derPublicKey, "testnet")
    //         return {
    //             message: "Get f1 address successfully",
    //             response: {
    //                 f1Address: f1Address
    //             }
    //         }
    //     } catch (error) {
    //         throw error
    //     }
    // }
}