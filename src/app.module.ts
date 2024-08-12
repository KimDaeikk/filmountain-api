import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KmsModule } from "./modules/kms/kms.module";
import { FilecoinClientModule } from './modules/filecoin-client/filecoin-client.module';
import { FilecoinContractModule } from './modules/filecoin-contract/filecoin-contract.module';
import { FilecoinClientService } from './modules/filecoin-client/filecoin-client.service';
import { FilecoinContractService } from './modules/filecoin-contract/filecoin-contract.service';
import { KmsService } from './modules/kms/kms.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
	imports: [
		ConfigModule.forRoot({
			envFilePath: `src/configs/env/.${process.env.NODE_ENV}.env`,
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
			  type: 'mysql',
			  host: configService.get('DB_HOST'),
			  port: configService.get<number>('DB_PORT'),
			  username: configService.get('DB_USERNAME'),
			  password: configService.get('DB_PASSWORD'),
			  database: configService.get('DB_NAME'),
			  entities: [__dirname + '/**/*.entity{.ts,.js}'],
			  synchronize: configService.get('NODE_ENV') !== 'production',
			}),
			inject: [ConfigService],
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
