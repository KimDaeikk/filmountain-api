import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilecoinContractController } from './filecoin-contract.controller';
import { FilecoinContractService } from './filecoin-contract.service';

@Module({
	imports: [ConfigModule],
	controllers: [FilecoinContractController],
	providers: [FilecoinContractService],
	exports: [FilecoinContractService],
})
export class FilecoinContractModule {}
