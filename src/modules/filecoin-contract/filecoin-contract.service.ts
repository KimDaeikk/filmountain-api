import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// filmountain v0
import FilmountainPoolV0ABI from './abi/filmountain-v0/FilmountainPoolV0.json';
import FilmountainRegistryV0ABI from './abi/filmountain-v0/FilmountainRegistry.json';
import SPVaultV0ABI from './abi/filmountain-v0/SPVaultV0.json';

// import {
// 	UpdateListPriceDto,
// 	UpdateMaxBidNumberDto,
// } from './dto/config.blockchain.dto';

@Injectable()
export class FilecoinContractService {
	// protected logger = new Logger(this.constructor.name);

	// constructor(private readonly configService: ConfigService) {}

    // registryV0Address = this.configService.get<string>('REGISTRY_V0_CONTRACT');
	// poolV0Address = this.configService.get<string>('POOL_V0_CONTRACT');
    // spVaultV0Address = this.configService.get<string>('VAULT_V0_CONTRACT');

    // privateKey = this.configService.get<string>("PRIVATE_KEY");
    // providerUrl = this.configService.get<string>('PROVIDER_URL');

	// poolV0abi = FilmountainPoolV0ABI.abi;

	// provider = new ethers.JsonRpcProvider(
	// 	this.providerUrl,
	// );

    // // 해당 유저가 실행을 요청했을때 DB에서 유저에 맞는 개인키를 어떻게 받아올 것인지
	// private getSigner(): ethers.Wallet {
	// 	const wallet = new ethers.Wallet(this.privateKey);
	// 	const signer = wallet.connect(this.provider);
	// 	return signer;
	// }

    // private getPoolV0ContractInstance(): ethers.Contract {
	// 	const signer = this.getSigner();
	// 	return new ethers.Contract(
	// 		this.poolV0Address,
	// 		this.poolV0abi,
	// 		signer,
	// 	);
	// }

	// /**
	//  * @description calls the Auction contract to create productAuction Struct and to mint a NFT
	//  * @requires name
	//  * @requires seller ethereum valid address
	//  * @requires owner only administrator wallet may request
	//  */
	// async depositPoolV0(
	// 	name: string,
	// 	seller: string,
	// ): Promise<number> {
	// 	const poolContract = this.getPoolV0ContractInstance();

	// 	let tx = await poolContract.deposit();
		
	// 	this.logger.log(
	// 		'creating product on blockchain for tokenId: ',
	// 		tokenId,
	// 	);
		
	// 	return tokenId;
	// }

	// /**
	//  * @description update Auction contract and set this product auction as listed
	//  * @requires tokenId auction not initialized before
	//  * @requires tokenId created requesting createProductToken
	//  * @requires initialPrice must be > 0
	//  * @requires owner administration wallet
	//  */
	// async withdrawPoolV0(
	// 	tokenId: number,
	// 	initialPrice: string,
	// ): Promise<any> {
	// 	const auctionContract = this.getAuctionContractInstance();
	// 	const updatedListingPrice = await auctionContract.getListPrice();

	// 	this.logger.log('initializing auction for tokenId: ', tokenId);
	// 	const auction = await auctionContract.initializeAuction(
	// 		tokenId,
	// 		ethers.utils.parseEther(initialPrice),
	// 		{
	// 			value: updatedListingPrice,
	// 		},
	// 	);
	// 	return auction;
	// }

	// /**
	//  * @description update AuctionProduct struct and update bidder with it's bestPrice
	//  * @requires tokenId auction initialized
	//  * @requires bidPrice higher than last bid
	//  * @requires owner administration wallet
	//  */
	// async bid(
	// 	tokenId: number,
	// 	bidPrice: string,
	// 	bidderAddress: string,
	// ): Promise<any> {
	// 	const auctionContract = this.getAuctionContractInstance();
	// 	this.logger.log('transacting a bid for tokenId: ', tokenId);
	// 	const tx = await auctionContract.bid(
	// 		tokenId,
	// 		ethers.utils.parseEther(bidPrice),
	// 		bidderAddress,
	// 		this.getGas(),
	// 	);
	// 	await tx.wait();
	// }

	// /**
	//  *
	//  * @param tokenId valid tokenId
	//  * @returns Auction[]
	//  */
	// async getAuctionOnChain(tokenId: number): Promise<any> {
	// 	const auctionContract = this.getAuctionContractInstance();
	// 	this.logger.log(
	// 		'Requesting Auction data from blockchain for tokenId: ',
	// 		tokenId,
	// 	);
	// 	const auction = await auctionContract.getAuction(tokenId);
	// 	this.logger.log('Auction retrieved for tokenId: ', tokenId);
	// 	return formatStruct(auction);
	// }

	// /**
	//  * @description retrieves list price info from chain
	//  */
	// async getMaxBidNumber(): Promise<number> {
	// 	try {
	// 		const auctionContract = this.getAuctionContractInstance();
	// 		this.logger.log('Query requested - Max Bid Number');
	// 		const maxBid: number = await auctionContract.getMaxBidAuction();
	// 		return formatStruct(maxBid);
	// 	} catch (error) {
	// 		this.logger.error(
	// 			`MaxBidNumber could not be retrieved from chain  ${error.message}`,
	// 			error.stack,
	// 		);
	// 		throw new NotFoundException('');
	// 	}
	// }

	// /**
	//  * @description updates the maximum bid number to trigger the winner selection and execute sale
	//  * @param maxBidNumber
	//  */
	// async updateMaxBidNumber(dto: UpdateMaxBidNumberDto): Promise<any> {
	// 	const auctionContract = this.getAuctionContractInstance();
	// 	this.logger.log(
	// 		'Update requested - Max bid number to : ',
	// 		dto.maxBidNumber,
	// 	);
	// 	await auctionContract.updateMaxBidNumber(dto.maxBidNumber);
	// }

	// /**
	//  * @description retrieves list price info from chain
	//  */
	// async getListPrice(): Promise<string> {
	// 	try {
	// 		const auctionContract = this.getAuctionContractInstance();
	// 		this.logger.log('Query requested - List Price');
	// 		const listPrice = await auctionContract.getListPrice();
	// 		return ethers.formatEther(listPrice);
	// 	} catch (error) {
	// 		this.logger.error(
	// 			`ListPrice could not be retrieved from chain  ${error.message}`,
	// 			error.stack,
	// 		);
	// 		throw new NotFoundException('');
	// 	}
	// }
	// /**
	//  * @description updates the maximum bid number to trigger the winner selection and execute sale
	//  * @param maxBidNumber
	//  */
	// async updateListPrice(dto: UpdateListPriceDto): Promise<any> {
	// 	const auctionContract = this.getAuctionContractInstance();
	// 	this.logger.log('Update requested - List Price to : ', dto.listPrice);
	// 	await auctionContract.updateListPrice(ethers.parseEther(dto.listPrice));
	// }
}
