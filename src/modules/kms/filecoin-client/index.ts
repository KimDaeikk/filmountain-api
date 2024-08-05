import { HttpJsonRpcConnector, LotusClient } from "filecoin.js";
import { AddressTools } from "./utils/address";
import { NetworkTools } from "./utils/network";
import { TxTools } from "./utils/tx";
import { WalletTools } from "./utils/wallet";

export class FilecoinClient {
    public readonly address: AddressTools;
    public readonly network: NetworkTools;
    public readonly tx: TxTools;
    public readonly wallet: WalletTools;

    constructor() {
        const connector = new HttpJsonRpcConnector({ url: rpcUrl, token });
        this.address = new AddressTools();
        this.network = new NetworkTools();
        this.tx = new TxTools();
        this.wallet = new WalletTools();
    }
}