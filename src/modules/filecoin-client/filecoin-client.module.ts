import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilecoinClientController } from './filecoin-client.controller';
import { FilecoinClientService } from './filecoin-client.service';

@Module({
	imports: [ConfigModule],
	controllers: [FilecoinClientController],
	providers: [FilecoinClientService],
	exports: [FilecoinClientService],
})
export class FilecoinContractModule {}
