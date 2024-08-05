import axios from 'axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { blake2b, blake2bInit, blake2bUpdate, blake2bFinal } from 'blakejs';
import cbor from "ipld-dag-cbor";
import { BigNumber } from 'bignumber.js';
import { multihash } from "multihashing-async";
import { HttpJsonRpcConnector, LotusClient } from "filecoin.js";
import { Address, CodeCID, INIT_ACTOR, InitMethod, Message, MessageResponse, MsgLookup, MsgParams, Network, TokenAmount } from "./utils/types/types";
import { addressAsBytes, serializeBigNum, getDigest } from './utils/signing';
import { Cid, MessagePartial, MethodMultisig } from 'filecoin.js/builds/dist/providers/Types';
import { EcdsaSignature } from './utils/asn1';
const { newAddress, ethAddressFromID, newDelegatedEthAddress, ethAddressFromDelegated } = require('@glif/filecoin-address')


@Injectable()
export class FilecoinClientService {
    protected logger = new Logger(this.constructor.name)
    private readonly lotusClient: LotusClient;

    private readonly providerUrl = this.configService.get<string>('PROVIDER_URL')
    private readonly lotusProviderUrl = this.providerUrl + "/rpc/v0"
    private readonly ethProviderUrl = this.providerUrl+"/rpc/v1"
    private readonly lotusToken = this.configService.get<string>("LOTUS_TOKEN")
    
    constructor(private readonly configService: ConfigService) {
        const connector = new HttpJsonRpcConnector({
            url: this.lotusProviderUrl, 
            token: this.lotusToken
        });
        this.lotusClient = new LotusClient(connector);
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- ADDRESS -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    public publicKeyToFilecoinAddress(decodedTrimmedPublicKey: Buffer, network: "mainnet" | "testnet"): string {
        // 공개키를 BLAKE2b-160 해시로 변환
        const blake2bHash = blake2b(decodedTrimmedPublicKey, null, 20); // 20바이트 출력
    
        // 파일코인 주소 생성
        const address = newAddress(1, blake2bHash).toString();
    
        // 네트워크에 따라 접두사 결정
        const prefix = network === 'mainnet' ? 'f1' : 't1';
        
        // 네트워크 접두사를 붙인 주소 반환
        return prefix + address.slice(2); // 'f1' 또는 't1' 접두사를 붙여 반환
    }
    
    // TODO TEST
    public async getF0Address(filAddress: string): Promise<string> {
        const f0Address = await this.lotusClient.state.lookupId(filAddress);
        return f0Address
    }

    // TODO TEST
    public getF0ToEthAddress(f0Address: string): string {
        const ethAddress = ethAddressFromID(f0Address).toString();
        return ethAddress;
    }

    // TODO TEST
    public getEthToF4Address(ethAddress: string): string {
        const f4Address = newDelegatedEthAddress(ethAddress);
        return f4Address;
    }

    // TODO TEST
    public getF4ToEthAddress(ethAddress: string): string {
        const f0Address = ethAddressFromDelegated(ethAddress)
        return f0Address
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- KMS SIGNATURE PARSING -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    public decodeKMSSignature(signature: Uint8Array): { r: string, s: string } {
        // ASN.1 DER 형식을 파싱하여 r과 s 값 추출
        const decodedSignature = EcdsaSignature.decode(Buffer.from(signature), 'der');
        const r: string = decodedSignature.r.toString(16);
        const s: string = decodedSignature.s.toString(16);
        
        return { r, s };
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- FVM MESSAGE -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    async createMessage(message: MessagePartial): Promise<{
        message: Message;
        totalGasFee: string;
        premiumTotalGasFee: string;
    }> {
        let msg: Message = {
            Version: message.Version ? message.Version : 0,
            To: message.To,
            From: message.From,
            Value: message.Value ? message.Value : new BigNumber(0),
            GasLimit: message.GasLimit ? message.GasLimit : 0,
            GasFeeCap: message.GasFeeCap ? message.GasFeeCap : new BigNumber(0),
            GasPremium: message.GasPremium ? message.GasPremium : new BigNumber(0),
            Method: message.Method ? message.Method : 0,
            Params: message.Params ? message.Params : '',
            Nonce: message.Nonce ? message.Nonce : await this.lotusClient.mpool.getNonce(message.From),
        }
        const estimatedObject = await this.estimateTotalGasFee(msg)
        return estimatedObject;
    }

    public createBasicSendMessage(
        to: string,
        from: string,
        value: BigNumber,
    ): Message {
        const unsignedMessage: Message = {
            Version: 0,
            To: to, // 수신자 주소
            From: from, // 송신자 주소
            Value: value, // 송금할 FIL (attoFIL 단위)
            GasLimit: null, // 가스 한도
            GasFeeCap: null, // 가스 가격 상한
            GasPremium: null, // 가스 프리미엄
            Method: 0, // 메서드 0은 기본 송금
            Params: "", // 기본 송금이므로 추가 파라미터 없음
            Nonce: 1, // 트랜잭션 Nonce (송신자의 계정에서 고유해야 함)
        };

        return unsignedMessage
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- FVM TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    async sendTransactionToLotus(r: string, s: string, unsignedMessage: Message): Promise<MsgLookup> {
        // 서명된 메시지 구성
        const signature = {
            Type: 1, // secp256k1 서명
            Data: Buffer.concat([Buffer.from(r, 'hex'), Buffer.from(s, 'hex')]).toString('base64')
        };
      
        const signedMessage = {
            Message: unsignedMessage,
            Signature: signature
        };
          
        // 트랜잭션 전송
        try {
            const CID = await this.lotusClient.mpool.push(signedMessage);
            return await this.lotusClient.state.waitMsg(CID, 0);
        } catch (error) {
            console.error('Error sending transaction to Lotus:', error);
        }
    }

    public async estimateTotalGasFee(message: Message): Promise<{ 
        message: Message, 
        totalGasFee: string, 
        premiumTotalGasFee: string,
    }> {
        // Estimate Gas for the message
        const estimatedMessage = await this.lotusClient.gasEstimate.messageGas(message);
        // Estimate GasPremium
        const gasPremium = await this.lotusClient.gasEstimate.gasPremium(10, message.From, estimatedMessage.GasLimit);
    
        estimatedMessage.GasPremium = BigNumber(gasPremium)

        // Calculate the total gas fee
        const totalGasFee = new BigNumber(estimatedMessage.GasLimit)
            .multipliedBy(new BigNumber(estimatedMessage.GasFeeCap));
        
        const premiumTotalGasFee = new BigNumber(estimatedMessage.GasLimit)
            .multipliedBy(new BigNumber(estimatedMessage.GasFeeCap).plus(gasPremium));
        
        return {
            message: estimatedMessage,
            totalGasFee: totalGasFee.toString(),
            premiumTotalGasFee: premiumTotalGasFee.toString(),
        };
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- MULTISIG MESSAGE -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    async createProposeMessage(multisigAddress: string, senderAddressOfProposeMsg: string, recipientAddress: string, value: string, method: number, params: any[]): Promise<MessagePartial> {
        const serializedParams = params.length ? cbor.util.serialize(params) : Buffer.from([]);
    
        const msgParams = [
            addressAsBytes(recipientAddress),
            serializeBigNum(value),
            method,
            serializedParams
        ]
        const serializedMsgParams = cbor.util.serialize(msgParams)
        const buff = Buffer.from(serializedMsgParams);
    
        let messageWithoutGasParams = {
            From: senderAddressOfProposeMsg,
            To: multisigAddress,
            Value: new BigNumber(0),
            Method: MethodMultisig.Propose,
            Params: buff.toString('base64')
        };
    
        return messageWithoutGasParams;
    };
    
    async createApproveOrCancelMessage(
        type: number,
        multisigAddress: string,
        senderAddressOfApproveMsg: string,
        proposedMessageId: number,
        proposerId: string,
        recipientAddress: string,
        method: number,
        value: string,
        values: any[],
    ): Promise<any> {  
        const serializedValues = values.length ? cbor.util.serialize(values) : Buffer.from([]);
    
        const proposalHashData = [
            addressAsBytes(proposerId),
            addressAsBytes(recipientAddress),
            serializeBigNum(value),
            method,
            serializedValues,
        ];
    
        const serializedProposalHashData = cbor.util.serialize(proposalHashData);
        const blakeCtx = blake2bInit(32);
        blake2bUpdate(blakeCtx, serializedProposalHashData);
        const hash = Buffer.from(blake2bFinal(blakeCtx));
    
        const params = [
            proposedMessageId,
            hash,
        ];
        const serializedParams = cbor.util.serialize(params);
    
        const buff = Buffer.from(serializedParams);
    
        const messageWithoutGasParams = {
            From: senderAddressOfApproveMsg,
            To: multisigAddress,
            Value: new BigNumber(0),
            Method: type,
            Params: buff.toString('base64'),
        };
    
        return messageWithoutGasParams;
    }

    // 메시지를 직렬화하고 해시화하는 함수
    public serializeAndHashMessage(message: object): Buffer {
        const serializedproposalHashData = cbor.util.serialize(message);
        const blakeCtx = blake2bInit(32);
        blake2bUpdate(blakeCtx, serializedproposalHashData);
        const hash = Buffer.from(blake2bFinal(blakeCtx));
        return hash
    }

    // // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- MULTISIG TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // public async msigProposeTransfer(
    //     address: string,
    //     recipientAddres: string,
    //     value: string,
    //     senderAddressOfProposeMsg: string,
    // ): Promise<Cid> {
    //     const params: any[] = [];
    //     const messageWithoutGasParams = await this.createProposeMessage(address, senderAddressOfProposeMsg, recipientAddres, value, 0, params)
    //     const message = await this.createMessage(messageWithoutGasParams);
    //     const signedMessage = await this.signMessage(message);
    //     const msgCid = await this.sendSignedMessage(signedMessage);
    //     return msgCid;
    // }
    
    // /**
    //  * approves a previously-proposed multisig message by transaction ID
    //  * @param address
    //  * @param proposedTransactionId
    //  * @param signerAddress
    //  */
    // public async msigApproveTransfer(
    //     address: string,
    //     proposedTransactionId: number,
    //     signerAddress: string,
    // ): Promise<Cid> {
    //     return null as any;
    // }

    // /**
    //  * approves a previously-proposed multisig message
    //  * @param address
    //  * @param proposedMessageId
    //  * @param proposerAddress
    //  * @param recipientAddres
    //  * @param value
    //  * @param senderAddressOfApproveMsg
    //  */
    // public async msigApproveTransferTxHash(
    //     address: string,
    //     proposedMessageId: number,
    //     proposerAddress: string,
    //     recipientAddres: string,
    //     value: string,
    //     senderAddressOfApproveMsg: string,
    // ): Promise<Cid> {
    //     const proposerId = await this.client.state.lookupId(proposerAddress);
    
    //     const messageWithoutGasParams = await createApproveMessage(
    //         address,
    //         senderAddressOfApproveMsg,
    //         proposedMessageId,
    //         proposerId,
    //         recipientAddres,
    //         0,
    //         value,
    //         []
    //     );
    
    //     const message = await this.createMessage(messageWithoutGasParams as any);
    //     const signedMessage = await this.signMessage(message);
    //     const msgCid = await this.sendSignedMessage(signedMessage);
    
    //     return msgCid;
    // }
    
    // /**
    //  * cancels a previously-proposed multisig message
    //  * @param address
    //  * @param senderAddressOfCancelMsg
    //  * @param proposedMessageId
    //  * @param recipientAddres
    //  * @param value
    //  */
    // public async msigCancelTransfer(
    //     address: string,
    //     senderAddressOfCancelMsg: string,
    //     proposedMessageId: number,
    //     recipientAddres: string,
    //     value: string,
    // ): Promise<Cid> {
    //     const proposerId = await this.client.state.lookupId(senderAddressOfCancelMsg);
    
    //     const messageWithoutGasParams = await createCancelMessage(
    //         address,
    //         senderAddressOfCancelMsg,
    //         proposedMessageId,
    //         proposerId,
    //         recipientAddres,
    //         0,
    //         value,
    //         []
    //     );
    
    //     const message = await this.createMessage(messageWithoutGasParams as any);
    //     const signedMessage = await this.signMessage(message);
    //     const msgCid = await this.sendSignedMessage(signedMessage);
    
    //     return msgCid;
    // }

    // // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- NETWORK INFO -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// async msigProposeFEVMTx(
    //     senderAddr: string,
    //     msigAddr: string,
    //     contractAddr: string,
    //     nonce: number,
    //     abi: ethers.utils.Interface,
    //     methodName: string,
    //     args: any[],
    //     value: BigNumber
    // ): Promise<any> {
    //     return this.msigProposeFEVMTxWithValue(
    //         senderAddr,
    //         msigAddr,
    //         contractAddr,
    //         nonce,
    //         abi,
    //         methodName,
    //         args,
    //         value,
    //     );
    // }

    // async msigProposeFEVMTxWithValue(
    //     senderAddr: string,
    //     msigAddr: string,
    //     contractAddr: string,
    //     nonce: number,
    //     abi: ethers.utils.Interface,
    //     methodName: string,
    //     args: any[],
    //     value: BigNumber,
    // ): Promise<any> {
    //     // EVM 스마트 계약 호출 데이터 생성
    //     const params = abi.encodeFunctionData(methodName, args);

    //     // 계약 주소를 파일코인 주소로 변환 (필요에 따라)
    //     const contractAddrFilForm = this.convertEthAddressToFilecoin(contractAddr);

    //     // Lotus에서 사용하는 CBOR로 데이터 직렬화
    //     const serializedParams = this.serializeParams(params);

    //     // 멀티시그 제안 파라미터 구성
    //     const proposeParams = {
    //         To: contractAddrFilForm,
    //         Value: value.toString(),
    //         Method: 3844450837,
    //         Params: serializedParams,
    //     };

    //     // 멀티시그 트랜잭션 제안 메시지 생성
    //     const message = {
    //         To: msigAddr,
    //         From: senderAddr,
    //         Value: '0',
    //         Nonce: nonce,
    //         Method: 2, // Multisig 프로포즈 메서드 ID
    //         Params: proposeParams,
    //     };

    //     // Lotus에 RPC 요청으로 트랜잭션 제출
    //     const result = await this.sendTransactionToLotus(message);
    //     return result;
    // }

    // private convertEthAddressToFilecoin(ethAddress: string): string {
    //     // 이더리움 주소를 파일코인 주소로 변환
    //     const filecoinAddress = ethAddressToFilecoinAddress(ethAddress);
    //     return filecoinAddress.toString();
    // }

    // private serializeParams(params: string): string {
    //     // CBOR 직렬화 로직
    //     // 이 예제에서는 단순히 문자열로 반환하지만,
    //     // 실제로는 CBOR 라이브러리를 사용하여 직렬화해야 함
    //     return params;
    // }

    //     private async sendTransactionToLotus(message: any): Promise<any> {
    //         const response = await axios.post(this.lotusProviderUrl, {
    //             jsonrpc: '2.0',
    //             method: 'Filecoin.MsigPropose',
    //             params: [message],
    //             id: 1,
    //         });

    //         if (response.data.error) {
    //             throw new Error(response.data.error.message);
    //         }

    //         return response.data.result;
    //     }
}