import { Network } from "../../../filecoin-client/utils/types/types";
import { blake2b } from 'blakejs';
const { newAddress, ethAddressFromID, newDelegatedEthAddress, ethAddressFromDelegated } = require('@glif/filecoin-address')

export class AddressTools {
    public publicKeyToFilecoinAddress(decodedTrimmedPublicKey: Buffer, network: Network): string {
        // 공개키를 BLAKE2b-160 해시로 변환
        const blake2bHash = blake2b(decodedTrimmedPublicKey, null, 20); // 20바이트 출력
    
        // 파일코인 주소 생성
        const address = newAddress(1, blake2bHash).toString();
    
        // 네트워크에 따라 접두사 결정
        const prefix = network === 'mainnet' ? 'f1' : 't1';
        
        // 네트워크 접두사를 붙인 주소 반환
        return prefix + address.slice(2); // 'f1' 또는 't1' 접두사를 붙여 반환
    }
    
    public getF0Address(): string {
        
    }

    public getF0ToEthAddress(f0Address: string): string {
        const ethAddress = ethAddressFromID(f0Address).toString();
        return ethAddress;
    }

    public getEthToF4Address(ethAddress: string): string {
        const f4Address = newDelegatedEthAddress(ethAddress);
        return f4Address;
    }

    public getF4ToEthAddress(ethAddress: string): string {
        const f0Address = ethAddressFromDelegated(ethAddress)
        return f0Address
    }
}