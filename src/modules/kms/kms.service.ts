import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSClient, CreateKeyCommand, CreateAliasCommand, ListAliasesCommand, DescribeKeyCommand, ScheduleKeyDeletionCommand, KeyMetadata, GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";

@Injectable()
export class KmsService {
    protected logger = new Logger(this.constructor.name);
    private kmsClient: KMSClient

    constructor() {
        this.kmsClient = new KMSClient({
            region: 'ap-northeast-2',
            credentials: {
              accessKeyId: process.env.KMS_ACCESS_KEY, 
              secretAccessKey: process.env.KMS_SECRET_ACCESS_KEY,
            }
        });
    }

    async findKeyByAlias(userIndex: string): (Promise<KeyMetadata>) {
        const listAliasesCommand = new ListAliasesCommand({});
        try {
            const aliasesResponse = await this.kmsClient.send(listAliasesCommand);
            const alias = aliasesResponse.Aliases?.find(a => a.AliasName === `alias/user_${userIndex}`);
        
            const describeKeyCommand = new DescribeKeyCommand({
                KeyId: alias.TargetKeyId,
            });
        
            const keyResponse = await this.kmsClient.send(describeKeyCommand);
        
            return keyResponse.KeyMetadata;
        } catch (error) {
            return null
        }
    }

    async generateKey(): (Promise<string>) {
		const command = new CreateKeyCommand({
            KeySpec: 'ECC_SECG_P256K1', // SECP256K1 곡선 사용
            KeyUsage: 'SIGN_VERIFY',    // 서명 및 검증 용도
            Origin: 'AWS_KMS',          // 키가 KMS에서 생성됨
            Description: 'secp256k1 key for signing'
          });
          
        try {
            const response = await this.kmsClient.send(command);
            const keyId = response.KeyMetadata.KeyId;
            this.logger.log(
                'Key Created:', keyId
            );
            
            return keyId;
        } catch (error) {
            this.logger.error('Error creating key:', error);
            return null
        }
	}

    async createAlias(index: string, keyId: string) {
        const createAliasCommand = new CreateAliasCommand({
            AliasName: `alias/user_${index}`,
            TargetKeyId: keyId,
        });
    
        try {
            await this.kmsClient.send(createAliasCommand);
            this.logger.log(
                'Set key alias complete'
            );
            return keyId;
        } catch (error) {
            this.logger.error('Error creating key:', error);
            return null
        }
    }

    async scheduleKeyDeletion(keyId: string, pendingWindowInDays: number = 7) {
        const command = new ScheduleKeyDeletionCommand({
            KeyId: keyId,
            PendingWindowInDays: pendingWindowInDays,
        });
        const response = await this.kmsClient.send(command);
        return response;
    }

    async getPublicKey(keyId: string): Promise<Buffer> {
        const command = new GetPublicKeyCommand({ KeyId: keyId });
        const response = await this.kmsClient.send(command);
        return response.PublicKey as Buffer;
      }
    
    async signTransaction(keyId: string, transaction: any): Promise<string> {
    // 트랜잭션 직렬화 (예: Filecoin에서 제공하는 직렬화 도구 사용)
    const serializedTx = FilecoinSigningTools.transactionSerialize(transaction);

    // KMS로 서명 요청
    const signCommand = new SignCommand({
        KeyId: keyId,
        Message: serializedTx,
        MessageType: 'RAW',
        SigningAlgorithm: 'ECDSA_SHA_256',
    });

    const response = await this.kmsClient.send(signCommand);
    
    // 서명된 트랜잭션 반환 (필요 시 인코딩 등 추가 작업 필요)
    const signature = response.Signature?.toString('base64');
    
    return signature;
    }
}