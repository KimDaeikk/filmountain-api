import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSClient, CreateKeyCommand, CreateAliasCommand, ListAliasesCommand, DescribeKeyCommand, ScheduleKeyDeletionCommand, KeyMetadata, GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import { EcdsaPubKey, EcdsaSignature } from '../filecoin-client/utils/asn1';
import { createHash } from 'crypto';
import blake from 'blakejs';
import { CID } from 'multiformats/cid';
import * as Digest from 'multiformats/hashes/digest';
import { sha256 } from 'multiformats/hashes/sha2';
import { encode as encodeCBOR } from '@ipld/dag-cbor';
import { Message } from '../filecoin-client/utils/types/types';
import * as elliptic from 'elliptic';

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

    // 메시지를 CBOR로 직렬화
    public serializeMessage(message: Message): Uint8Array {
        return encodeCBOR(message);
    }

    // CID 생성
    public createCID(message: Message): CID {
        const serializedMessage = this.serializeMessage(message);
        const hash = blake.blake2b(serializedMessage, null, 32); // Blake2b-256 해싱

        // Multihash로 변환
        const multihashDigest = Digest.create(0xb220, hash); // 0xb220은 Blake2b-256의 multicodec 코드

        return CID.createV1(0x71, multihashDigest);  // 0x71은 DAG-CBOR 멀티코드
    }

    // Blake2b-256 해싱 후 CID의 바이트 배열을 다시 해싱
    public hashCidBytes(message: Message): Uint8Array {
        const cid = this.createCID(message);
        return blake.blake2b(cid.bytes, null, 32); // CID 바이트 배열에 대해 Blake2b-256 해싱
    }

    public uint8ArrayToHex(array: Uint8Array): string {
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // AWS KMS를 사용해 트랜잭션에 서명하는 함수
    async signWithKMS(keyId: string, cidHash: Uint8Array): Promise<{ signature: Uint8Array, recoveryId: number }> {
        const ec = new elliptic.ec('secp256k1');
        // KMS에서 서명 생성
        const signCommand = new SignCommand({
            KeyId: keyId,
            SigningAlgorithm: 'ECDSA_SHA_256',
            MessageType: 'DIGEST',
            Message: cidHash,
        });

        const response = await this.kmsClient.send(signCommand);
    
        // DER 디코딩하여 r과 s 값을 추출
        const signature = new Uint8Array(response.Signature);
        const rLength = signature[3];
        const r = signature.slice(4, 4 + rLength);
        const s = signature.slice(4 + rLength + 2);
    
        // 공개 키 가져오기 (AWS KMS에서)
        const publicKey = await this.getPublicKey(keyId);
    
        // 복구 ID 계산
        let recoveryId = -1;
        for (let i = 0; i < 4; i++) {
        const key = ec.recoverPubKey(
            cidHash, // cidHash는 이미 Uint8Array 형태여야 합니다.
            { 
                r: this.uint8ArrayToHex(r), 
                s: this.uint8ArrayToHex(s)
            },
            i
        );
        if (key.encode('hex', true) === publicKey) { // compressed public key format
            recoveryId = i;
            break;
        }
    }
    
        if (recoveryId === -1) {
            throw new Error('Failed to calculate recovery id');
        }
    
        // 65바이트 서명 생성 (r + s + recoveryId)
        const signatureBytes = new Uint8Array(65);
        signatureBytes.set(r, 0);
        signatureBytes.set(s, 32);
        signatureBytes[64] = recoveryId;
    
        return { signature: signatureBytes, recoveryId };
    }

    public decodeKMSSignature(signature: Uint8Array): { r: string, s: string } {
        // ASN.1 DER 형식을 파싱하여 r과 s 값 추출
        const decodedSignature = EcdsaSignature.decode(Buffer.from(signature), 'der');
        const r: string = decodedSignature.r.toString(16);
        const s: string = decodedSignature.s.toString(16);
        
        return { r, s };
    }
}