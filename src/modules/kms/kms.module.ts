import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KmsController } from './kms.controller';
import { KmsService } from './kms.service';

@Module({
	imports: [ConfigModule],
	controllers: [KmsController],
	providers: [KmsService],
	exports: [KmsService],
})
export class KmsModule {}
