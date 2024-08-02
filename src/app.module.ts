import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { TypeOrmModule } from '@nestjs/typeorm';
import { KmsModule } from "./modules/kms/kms.module";
import { FilecoinContractModule } from './modules/filecoin-contract/filecoin-contract.module';

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
		FilecoinContractModule,
		KmsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
