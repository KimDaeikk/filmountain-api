import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { TypeOrmModule } from '@nestjs/typeorm';
import { KmsModule } from "./modules/kms/kms.module";
import { FilecoinClientModule } from './modules/filecoin-client/filecoin-client.module';
import { FilecoinContractModule } from './modules/filecoin-contract/filecoin-contract.module';
import { FilecoinClientService } from './modules/filecoin-client/filecoin-client.service';
import { FilecoinContractService } from './modules/filecoin-contract/filecoin-contract.service';
import { KmsService } from './modules/kms/kms.service';

@Module({
	imports: [
		// TypeOrmModule.forRoot({
		//   type: 'mysql',
		//   host: 'localhost',
		//   port: 3306,
		//   username: 'root',
		//   password: '1234',
		//   database: 'test',
		//   synchronize: true,
		// }),
		ConfigModule.forRoot({
			envFilePath: `src/configs/env/.${process.env.NODE_ENV}.env`,
			isGlobal: true,
		}),
		FilecoinClientModule,
		FilecoinContractModule,
		KmsModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		FilecoinClientService,
		FilecoinContractService,
		KmsService,
	],
})
export class AppModule {}
