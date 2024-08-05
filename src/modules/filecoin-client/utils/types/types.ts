import { BigNumber } from "bignumber.js";

export type Address = string;

export type PrivateKey = string;

export type TokenAmount = BigNumber;

export type Nonce = number;

export type MsgParams = string;

export type CID =
    | string
    | {
          "/": string;
      };

export type MessageReceipt = {
    ExitCode: number;
    Return: any;
    GasUsed: number;
};

export type MsgLookup = {
    Message: CID;
    Receipt: MessageReceipt;
    ReturnDec: any;
    TipSet: CID[];
    Height: number;
};

export type MessageResponse = CID | MsgLookup;

export type Network = "mainnet" | "testnet";

export type SignedVoucherBase64 = string;

export type VoucherBase64 = string;

export type HashedSecret = string;

export enum ProtocolIndicator {
    ID,
    SECP256K1,
    ACTOR,
    BLS,
}

export enum CodeCID {
    PaymentChannel = "fil/4/paymentchannel",
    Multisig = "fil/4/multisig",
}

export enum INIT_ACTOR {
    mainnet = "f01",
    testnet = "t01",
}

export enum InitMethod {
    None,
    Constructor,
    Exec,
}

export enum PaymentChannelMethod {
    None,
    Construtor,
    UpdateChannelState,
    Settle,
    Collect,
}

export enum MultisigMethod {
    None,
    Constructor,
    Propose,
    Approve,
    Cancel,
    AddSigner,
    RemoveSigner,
    SwapSigner,
    ChangeNumApprovalsThreshhold,
}

export interface Message {
    Version?: number;
    To: Address;
    From: Address;
    Nonce: Nonce;
    Value: BigNumber;
    GasLimit: number;
    GasFeeCap: BigNumber;
    GasPremium: BigNumber;
    Method: number;
    Params: string;
}

export type Voucher = string;

export type FilecoinNetwork = "f" | "t";

export interface Signature {
    Data: string;
    Type: number;
}

export interface SignedMessage {
    Message: Message;
    Signature: Signature;
}
