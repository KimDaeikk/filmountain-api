import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSSigner } from '@hashflow/aws-kms-ethers-signer';
import { ethers } from 'ethers';
import axios from 'axios';
import { BigNumber } from 'ethers';
const { ethAddressToFilecoinAddress } = require('@zondax/filecoin-signing-tools');

// filmountain v0
import FilmountainPoolV0ABI from './abi/filmountain-v0/FilmountainPoolV0.json';
import FilmountainAddressRegistryV0ABI from './abi/filmountain-v0/FilmountainAddressRegistry.json';
import FilmountainUserRegistryV0ABI from './abi/filmountain-v0/FilmountainUserRegistry.json';
import SPVaultV0ABI from './abi/filmountain-v0/SPVaultV0.json';

@Injectable()
export class FilecoinContractService {
    protected logger = new Logger(this.constructor.name)
    private signer: KMSSigner
    private readonly poolV0abi: any;
    private readonly addressRegistryV0abi: any;
    private readonly userRegistryV0abi: any;
    private readonly spVaultV0abi: any;

    addressRegistryV0Address = this.configService.get<string>('ADDRESS_REGISTRY_CONTRACT')
    userRegistryV0Address = this.configService.get<string>('USER_REGISTRY_CONTRACT')
    poolV0Address = this.configService.get<string>('POOL_V0_CONTRACT')
    spVaultV0Address = this.configService.get<string>('VAULT_V0_CONTRACT')

    providerUrl = this.configService.get<string>('PROVIDER_URL')
    lotusProviderUrl = this.providerUrl + "/rpc/v0"
    ethProviderUrl = this.providerUrl+"/rpc/v1"
    
    constructor(private readonly configService: ConfigService) {
        this.poolV0abi = FilmountainPoolV0ABI.abi;
        this.addressRegistryV0abi = FilmountainAddressRegistryV0ABI.abi;
        this.userRegistryV0abi = FilmountainUserRegistryV0ABI.abi;
        this.spVaultV0abi = SPVaultV0ABI.abi;
    }

    private getPoolV0ContractInstance(keyId: string): ethers.Contract {
        return new ethers.Contract(
            this.poolV0Address,
            this.poolV0abi,
            this.signer as unknown as ethers.Signer,
        );
    }

    async depositPoolV0(keyId: string) {
        const poolContract = this.getPoolV0ContractInstance(keyId);
        // ABI에 있는 정확한 함수명을 사용하여 함수를 호출합니다.
        const tx = await poolContract['deposit()']({ value: ethers.utils.parseEther("5"), gasLimit: ethers.utils.hexlify(3000000) });
        console.log(tx);
    }

	/**
	 * @description update Auction contract and set this product auction as listed
	 * @requires tokenId auction not initialized before
	 * @requires tokenId created requesting createProductToken
	 * @requires initialPrice must be > 0
	 * @requires owner administration wallet
	 */
	async withdrawPoolV0(keyId: string, senderAddr: string, msigAddr: string, nonce: number) {
		const poolContract = this.getPoolV0ContractInstance(keyId);
		const withdrawData = poolContract.interface.encodeFunctionData('withdraw', []);
		const contractAddrFilForm = this.convertEthAddressToFilecoin(this.poolV0Address);
		const proposeParams = {
			To: contractAddrFilForm,
			Value: '0',
			Method: 3844450837,
			Params: withdrawData,
		};
		const message = {
			To: msigAddr,
			From: senderAddr,
			Value: '0',
			Nonce: nonce,
			Method: 2,
			Params: proposeParams,
		};
		const result = await this.sendTransactionToLotus(message);
		return result;
	}

	async msigProposeFEVMTx(
        senderAddr: string,
        msigAddr: string,
        contractAddr: string,
        nonce: number,
        abi: ethers.utils.Interface,
        methodName: string,
        args: any[],
        value: BigNumber
    ): Promise<any> {
        return this.msigProposeFEVMTxWithValue(
            senderAddr,
            msigAddr,
            contractAddr,
            nonce,
            abi,
            methodName,
            args,
            value,
        );
    }

    async msigProposeFEVMTxWithValue(
        senderAddr: string,
        msigAddr: string,
        contractAddr: string,
        nonce: number,
        abi: ethers.utils.Interface,
        methodName: string,
        args: any[],
        value: BigNumber,
    ): Promise<any> {
        // EVM 스마트 계약 호출 데이터 생성
        const params = abi.encodeFunctionData(methodName, args);

        // 계약 주소를 파일코인 주소로 변환 (필요에 따라)
        const contractAddrFilForm = this.convertEthAddressToFilecoin(contractAddr);

        // Lotus에서 사용하는 CBOR로 데이터 직렬화
        const serializedParams = this.serializeParams(params);

        // 멀티시그 제안 파라미터 구성
        const proposeParams = {
            To: contractAddrFilForm,
            Value: value.toString(),
            Method: 3844450837,
            Params: serializedParams,
        };

        // 멀티시그 트랜잭션 제안 메시지 생성
        const message = {
            To: msigAddr,
            From: senderAddr,
            Value: '0',
            Nonce: nonce,
            Method: 2, // Multisig 프로포즈 메서드 ID
            Params: proposeParams,
        };

        // Lotus에 RPC 요청으로 트랜잭션 제출
        const result = await this.sendTransactionToLotus(message);
        return result;
    }

    private convertEthAddressToFilecoin(ethAddress: string): string {
        // 이더리움 주소를 파일코인 주소로 변환
        const filecoinAddress = ethAddressToFilecoinAddress(ethAddress);
        return filecoinAddress.toString();
    }

    private serializeParams(params: string): string {
        // CBOR 직렬화 로직
        // 이 예제에서는 단순히 문자열로 반환하지만,
        // 실제로는 CBOR 라이브러리를 사용하여 직렬화해야 함
        return params;
    }

    private async sendTransactionToLotus(message: any): Promise<any> {
        const response = await axios.post(this.lotusProviderUrl, {
            jsonrpc: '2.0',
            method: 'Filecoin.MsigPropose',
            params: [message],
            id: 1,
        });

        if (response.data.error) {
            throw new Error(response.data.error.message);
        }

        return response.data.result;
    }
}
