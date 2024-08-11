import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsKmsSigner } from "@cuonghx.gu-tech/ethers-aws-kms-signer";
import { ethers } from 'ethers';
import axios from 'axios';
const { ethAddressToFilecoinAddress } = require('@zondax/filecoin-signing-tools');

// filmountain v0
import FilmountainPoolV0ABI from './abi/filmountain-v0/FilmountainPoolV0.json';
import FilmountainAddressRegistryV0ABI from './abi/filmountain-v0/FilmountainAddressRegistry.json';
import FilmountainUserRegistryV0ABI from './abi/filmountain-v0/FilmountainUserRegistry.json';
import SPVaultV0ABI from './abi/filmountain-v0/SPVaultV0.json';
import MultiSigWalletABI from './abi/msig/MultiSigWallet.json';

@Injectable()
export class FilecoinContractService {
    protected logger = new Logger(this.constructor.name)
    private readonly poolV0abi: any;
    private readonly addressRegistryV0abi: any;
    private readonly userRegistryV0abi: any;
    private readonly spVaultV0abi: any;
    private readonly multiSigabi: any;

    addressRegistryV0Address = this.configService.get<string>('ADDRESS_REGISTRY_CONTRACT')
    userRegistryV0Address = this.configService.get<string>('USER_REGISTRY_CONTRACT')
    poolV0Address = this.configService.get<string>('POOL_V0_CONTRACT')
    spVaultV0Address = this.configService.get<string>('VAULT_V0_CONTRACT')
    multiSigAddress = this.configService.get<string>("MSIG_CONTRACT")

    gasLimit = this.configService.get<string>("GAS_LIMIT")
    chainId = this.configService.get<string>("CHAIN_ID")
    providerUrl = this.configService.get<string>('PROVIDER_URL')
    lotusProviderUrl = this.providerUrl + "/rpc/v0"
    ethProviderUrl = this.providerUrl+"/rpc/v1"

    provider = new ethers.JsonRpcProvider(this.ethProviderUrl);
    
    constructor(private readonly configService: ConfigService) {
        this.poolV0abi = FilmountainPoolV0ABI.abi
        this.addressRegistryV0abi = FilmountainAddressRegistryV0ABI.abi
        this.userRegistryV0abi = FilmountainUserRegistryV0ABI.abi
        this.spVaultV0abi = SPVaultV0ABI.abi
        this.multiSigabi = MultiSigWalletABI.abi
    }

    async getSigner(keyId: string): Promise<AwsKmsSigner> {
        const signer = new AwsKmsSigner({
            keyId: keyId,
            region: "ap-northeast-2",
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY'), 
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
            }
        });
    
        return signer.connect(this.provider);
    }

    async getEthAddress(keyId: string): Promise<string> {
        const signer = await this.getSigner(keyId)
        return await signer.getAddress()
    }

    // -=-=-=-=-=-=-=-=-=-=-=- CONTRACT INSTANCE -=-=-=-=-=-=-=-=-=-=-=-
    async getAddressRegistryContractInstance(keyId: string): Promise<ethers.Contract> {
        const signer = await this.getSigner(keyId);
        return new ethers.Contract(
            this.addressRegistryV0Address,
            this.addressRegistryV0abi,
            signer
        );
    }

    async getUserRegistryContractInstance(keyId: string): Promise<ethers.Contract> {
        const signer = await this.getSigner(keyId);
        return new ethers.Contract(
            this.userRegistryV0Address,
            this.userRegistryV0abi,
            signer
        );
    }

    async getPoolV0ContractInstance(keyId: string): Promise<ethers.Contract> {
        const signer = await this.getSigner(keyId);
        return new ethers.Contract(
            this.poolV0Address,
            this.poolV0abi,
            signer
        );
    }

    async getSPVaultV0ContractInstance(keyId: string): Promise<ethers.Contract> {
        const signer = await this.getSigner(keyId);
        return new ethers.Contract(
            this.spVaultV0Address,
            this.spVaultV0abi,
            signer
        )
    }

    async getMultiSigContractInstance(keyId: string): Promise<ethers.Contract> {
        const signer = await this.getSigner(keyId);
        return new ethers.Contract(
            this.multiSigAddress,
            this.multiSigabi,
            signer
        );
    }

    // -=-=-=-=-=-=-=-=-=-=-=- MULTISIG TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-
    async submitTransaction(
        keyId: string,
        toAddress: string,
        amount: string,    
        data: string,   
    ): (Promise<string>) {
        const signer = await this.getSigner(keyId);
        const contract = await this.getMultiSigContractInstance(keyId);
        const transactionIndex = await contract.getTransactionCount();
        const nonce = await this.provider.getTransactionCount(await signer.getAddress());
        const feeData = await this.provider.getFeeData();
        // 실행시키려는 MultiSig의 함수
        const contractArguments = contract.interface.encodeFunctionData("submitTransaction(address,uint256,bytes)", [
            toAddress,
            amount,
            // MultiSig에서 실행시킬 함수
            data
        ]);
        // MultiSig의 트랜잭션
        const tx = {
            to: this.multiSigAddress,
            value: amount,
            gasLimit: this.gasLimit,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            nonce: nonce, 
            chainId: this.chainId,
            data: contractArguments,
        }

        // 서명 및 전송
        const signedTransaction = await signer.signTransaction(tx);
        const transactionResponse = await this.provider.send('eth_sendRawTransaction', [signedTransaction]);
        const receipt = await this.provider.waitForTransaction(transactionResponse);
        const txReceipt = await this.provider.getTransactionReceipt(receipt.hash)

        if (receipt.status === 0) {
            // 트랜잭션 실패
            console.log(txReceipt);
            console.error('Transaction failed with status 0 (revert).');
            return null;
        } else {
            // 트랜잭션 성공
            console.log('Transaction successful:', receipt);
            return transactionIndex;
        }
    }

    async confirmTransaction(
        keyId: string,
        txIndex: string,
        amount: string,
    ) {
        const signer = await this.getSigner(keyId);
        const contract = await this.getMultiSigContractInstance(keyId);
        const nonce = await this.provider.getTransactionCount(await signer.getAddress());
        const feeData = await this.provider.getFeeData();
        // 실행시키려는 MultiSig의 함수
        const contractArguments = contract.interface.encodeFunctionData("confirmTransaction(uint256)", [
            txIndex
        ]);
        // MultiSig의 트랜잭션
        const tx = {
            to: this.multiSigAddress,
            value: amount,
            gasLimit: this.gasLimit,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            nonce: nonce, 
            chainId: this.chainId,
            data: contractArguments,
        }

        // 서명 및 전송
        const signedTransaction = await signer.signTransaction(tx);
        const transactionResponse = await this.provider.send('eth_sendRawTransaction', [signedTransaction]);
        const receipt = await this.provider.waitForTransaction(transactionResponse);
        const txReceipt = await this.provider.getTransactionReceipt(receipt.hash)

        if (receipt.status === 0) {
            // 트랜잭션 실패
            console.log(txReceipt);
            console.error('Transaction failed with status 0 (revert).');
            return
        } else {
            // 트랜잭션 성공
            console.log('Transaction successful:', receipt);
        }
    }

    async executeTransaction(
        keyId: string,
        txIndex: string,
        amount: string,
    ) {
        const signer = await this.getSigner(keyId);
        const contract = await this.getMultiSigContractInstance(keyId);
        const nonce = await this.provider.getTransactionCount(await signer.getAddress());
        const feeData = await this.provider.getFeeData();
        // 실행시키려는 MultiSig의 함수
        const contractArguments = contract.interface.encodeFunctionData("executeTransaction(uint256)", [
            txIndex
        ]);
        // MultiSig의 트랜잭션
        const tx = {
            to: this.multiSigAddress,
            value: amount,
            gasLimit: this.gasLimit,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            nonce: nonce, 
            chainId: this.chainId,
            data: contractArguments,
        }

        // 서명 및 전송
        const signedTransaction = await signer.signTransaction(tx);
        const transactionResponse = await this.provider.send('eth_sendRawTransaction', [signedTransaction]);
        const receipt = await this.provider.waitForTransaction(transactionResponse);
        const txReceipt = await this.provider.getTransactionReceipt(receipt.hash)

        if (receipt.status === 0) {
            // 트랜잭션 실패
            console.log(txReceipt);
            console.error('Transaction failed with status 0 (revert).');
            return
        } else {
            // 트랜잭션 성공
            console.log('Transaction successful:', receipt);
        }
    }

    // -=-=-=-=-=-=-=-=-=-=-=- Filmountain USER TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-
    async depositPoolV0(keyId: string, amount: string) {
        const signer = await this.getSigner(keyId);
        const contract = await this.getPoolV0ContractInstance(keyId);
        const nonce = await this.provider.getTransactionCount(await signer.getAddress());
        const feeData = await this.provider.getFeeData();
        const contractArugments = contract.interface.encodeFunctionData("deposit()", []);
        const tx = {
            to: this.poolV0Address,
            value: amount,
            gasLimit: this.gasLimit, // TODO 하드코딩 아니여야함
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            nonce: nonce, // 트랜잭션 넘버
            chainId: this.chainId,
            data: contractArugments,
        };
    
        // 서명 및 전송
        const signedTransaction = await signer.signTransaction(tx);
        const transactionResponse = await this.provider.send('eth_sendRawTransaction', [signedTransaction]);
        const receipt = await this.provider.waitForTransaction(transactionResponse);

        if (receipt.status === 0) {
            // 트랜잭션 실패 
            console.log(receipt);
            console.error('Transaction failed with status 0 (revert).');
            return
        } else {
            // 트랜잭션 성공
            console.log('Transaction successful:', receipt);
        }
    }

    // -=-=-=-=-=-=-=-=-=-=-=- Filmountain ADMIN TRANSACTION -=-=-=-=-=-=-=-=-=-=-=-
    // -=-=- ADDRESS REGISTRY -=-=-
    async getAddressRegistrySetPoolSignature(keyId: string, poolAddress: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const addressRegistryContract = await this.getAddressRegistryContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const addressRegistryAddress = this.addressRegistryV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = addressRegistryContract.interface.encodeFunctionData("setPool(address)", [
            poolAddress
        ]);
		
        return { addressRegistryAddress, contractArguments }
	}

    async getAddressRegistrySetVaultSignature(keyId: string, vaultAddress: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const addressRegistryContract = await this.getAddressRegistryContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const addressRegistryAddress = this.addressRegistryV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = addressRegistryContract.interface.encodeFunctionData("setVault(address)", [
            vaultAddress
        ]);
		
        return { addressRegistryAddress, contractArguments }
    }

    async getAddressRegistrySetZcSignature(keyId: string, zcAddress: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const addressRegistryContract = await this.getAddressRegistryContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const addressRegistryAddress = this.addressRegistryV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = addressRegistryContract.interface.encodeFunctionData("setZC(address)", [
            zcAddress
        ]);
		
        return { addressRegistryAddress, contractArguments }
    }

    // -=-=- USER REGISTRY -=-=-
    async getUserRegistryAddUserSignature(keyId: string, userAddress: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const userRegistryContract = await this.getUserRegistryContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const userRegistryAddress = this.userRegistryV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = userRegistryContract.interface.encodeFunctionData("addUser(address)", [
            userAddress
        ]);
		
        return { userRegistryAddress, contractArguments }
    }

    async getUserRegistryRemoveUserSignature(keyId: string, userAddress: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const userRegistryContract = await this.getUserRegistryContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const userRegistryAddress = this.userRegistryV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = userRegistryContract.interface.encodeFunctionData("removeUser(address)", [
            userAddress
        ]);
		
        return { userRegistryAddress, contractArguments }
    }

    // -=-=- POOL V0 -=-=-
    async getPoolV0WithdrawSignature(keyId: string, fromAddress: string, toAddress: string, amount: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const poolContract = await this.getPoolV0ContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const poolV0Address = this.poolV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = poolContract.interface.encodeFunctionData("withdraw(address,address,uin256)", [
            fromAddress,
            toAddress,
            amount
        ]);
		
        return { poolV0Address, contractArguments }
	}

    async getPoolV0PayPrincipalSignature(keyId: string, toAddress: string) {
        // 해당 컨트랙트의 function selector를 가져오기 위해서
        const poolContract = await this.getPoolV0ContractInstance(keyId);
        // sequence id를 가져오기 위해서
        const poolV0Address = this.poolV0Address
        // MultiSig에서 실행시킬 함수 data
        const contractArguments = poolContract.interface.encodeFunctionData("payPrincipal(address)", [
            toAddress
        ]);
		
        return { poolV0Address, contractArguments }
	}

    // -=-=- SP VAULT V0 -=-=-
    async getVaultV0BorrowSignature(keyId: string, amount: string) {
        const vaultContract = await this.getSPVaultV0ContractInstance(keyId);
        const vaultV0Address = this.spVaultV0Address;
        const contractArguments = vaultContract.interface.encodeFunctionData("borrow(uint256)", [
            amount
        ]);

        return { vaultV0Address, contractArguments }
    }
}
