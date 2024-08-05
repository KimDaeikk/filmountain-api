import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSClient, CreateKeyCommand, CreateAliasCommand, ListAliasesCommand, DescribeKeyCommand, ScheduleKeyDeletionCommand, KeyMetadata, GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import { EcdsaPubKey, EcdsaSignature } from './filecoin-client/utils/asn1';
import { createHash } from 'crypto';
import CID from 'cids';

@Injectable()
export class KmsService {
    protected logger = new Logger(this.constructor.name);
    private kmsClient: KMSClient

    constructor(private readonly configService: ConfigService) {
        this.kmsClient = new KMSClient({
            region: 'ap-northeast-2',
            credentials: {
              accessKeyId: this.configService.get<string>('KMS_ACCESS_KEY'), 
              secretAccessKey: this.configService.get<string>('KMS_SECRET_ACCESS_KEY'),
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
        const apiResponse = await this.kmsClient.send(command);
        const publicKey = apiResponse.PublicKey;
        if (!publicKey) {
            return
        }
        const decodedAsn1Struct = EcdsaPubKey.decode(Buffer.from(publicKey), 'der');
        const decodedPublicKey = decodedAsn1Struct.pubKey.data;
        const decodedTrimmedPublicKey = decodedPublicKey.slice(
            1,
            decodedPublicKey.length
        );

        return decodedTrimmedPublicKey
    }

    // 메시지를 직렬화하고 해시화하는 함수
    public serializeAndHashMessage(message: object): Buffer {
        // 메시지를 CBOR로 직렬화 (Rust 코드에서는 to_vec 사용)
        const serializedMessage = Buffer.from(JSON.stringify(message)); // 단순 JSON 직렬화 (CBOR 필요시 적절한 라이브러리 사용)

        // 메시지 해시를 생성 (Blake2b-256 해시)
        const hash = createHash('blake2b256').update(serializedMessage).digest();

        // CID 생성 (v1, dag-cbor)
        const cid = new CID(1, 'dag-cbor', hash);

        // CID의 바이트를 해시화
        return createHash('blake2b256').update(cid.bytes).digest();
    }

    // AWS KMS를 사용해 트랜잭션에 서명하는 함수
    async signWithKMS(message: object, keyId: string, region: string): Promise<Uint8Array> {
        // KMS 클라이언트 초기화
        const kmsClient = new KMSClient({ region });

        // 메시지 해시 생성
        const messageDigest = this.serializeAndHashMessage(message);

        // KMS에서 서명 생성
        const signCommand = new SignCommand({
            KeyId: keyId,
            SigningAlgorithm: 'ECDSA_SHA_256',
            MessageType: 'DIGEST',
            Message: messageDigest,
        });

        const response = await kmsClient.send(signCommand);
        const signature = response.Signature;

        if (!signature) {
            throw new Error('Could not fetch signature from KMS.');
        }

        return signature
    }
}