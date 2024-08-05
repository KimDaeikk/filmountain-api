/*************************************************
 * Title: filecoin-signing-tools
 * Author: Zondax
 * Availability: https://github.com/Zondax/filecoin-signing-tools/blob/master/signer-npm/js/src/utils/index.js
 *************************************************/

import blake from "blakejs";
import leb from "leb128";
import base32Decode from "base32-decode";
import BN from "bn.js";
import { Address, ProtocolIndicator } from "./types/types";

const CID_PREFIX = Buffer.from([0x01, 0x71, 0xa0, 0xe4, 0x02, 0x20]);

export function createHash(message: ArrayLike<number>): Buffer {
    const blakeCtx = blake.blake2bInit(32);
    blake.blake2bUpdate(blakeCtx, message);
    return Buffer.from(blake.blake2bFinal(blakeCtx));
}

function getCID(message) {
    const blakeCtx = blake.blake2bInit(32);
    blake.blake2bUpdate(blakeCtx, message);
    const hash = Buffer.from(blake.blake2bFinal(blakeCtx));
    return Buffer.concat([CID_PREFIX, hash]);
}

export function getDigest(message) {
    // digest = blake2-256( prefix + blake2b-256(tx) )

    const blakeCtx = blake.blake2bInit(32);
    blake.blake2bUpdate(blakeCtx, getCID(message));
    return Buffer.from(blake.blake2bFinal(blakeCtx));
}

export function addressAsBytes(address: Address) {
    let addressDecoded: ArrayBuffer;
    let payload: ArrayBuffer;
    let checksum: Buffer;
    const protocolIndicator = address[1];
    const protocolIndicatorByte = `0${protocolIndicator}`;

    switch (Number(protocolIndicator)) {
        case ProtocolIndicator.ID:
            if (address.length > 18) {
                throw new InvalidPayloadLength();
            }
            return Buffer.concat([
                Buffer.from(protocolIndicatorByte, "hex"),
                Buffer.from(leb.unsigned.encode(address.substr(2))),
            ]);
        case ProtocolIndicator.SECP256K1:
            addressDecoded = base32Decode(address.slice(2).toUpperCase(), "RFC4648");

            payload = addressDecoded.slice(0, -4);
            checksum = Buffer.from(addressDecoded.slice(-4));

            if (payload.byteLength !== 20) {
                throw new InvalidPayloadLength();
            }
            break;
        case ProtocolIndicator.ACTOR:
            addressDecoded = base32Decode(address.slice(2).toUpperCase(), "RFC4648");

            payload = addressDecoded.slice(0, -4);
            checksum = Buffer.from(addressDecoded.slice(-4));

            if (payload.byteLength !== 20) {
                throw new InvalidPayloadLength();
            }
            break;
        case ProtocolIndicator.BLS:
            throw new ProtocolNotSupported("BLS");
        default:
            throw new UnknownProtocolIndicator();
    }

    const bytesAddress = Buffer.concat([Buffer.from(protocolIndicatorByte, "hex"), Buffer.from(payload)]);

    if (getChecksum(bytesAddress).toString("hex") !== checksum.toString("hex")) {
        throw new InvalidChecksumAddress();
    }

    return bytesAddress;
}

export function getChecksum(payload) {
    const blakeCtx = blake.blake2bInit(4);
    blake.blake2bUpdate(blakeCtx, payload);
    return Buffer.from(blake.blake2bFinal(blakeCtx));
}

export function serializeBigNum(value: string) {
    if (value === "0") {
        return Buffer.from("");
    }
    const valueBigInt = new BN(value, 10);
    const valueBuffer = valueBigInt.toArrayLike(Buffer, "be", valueBigInt.byteLength());
    return Buffer.concat([Buffer.from("00", "hex"), valueBuffer]);
}