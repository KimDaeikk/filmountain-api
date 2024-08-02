import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	const config = new DocumentBuilder()
		.setTitle('Filmountain blockchain API Documentation')
		.setDescription('Filmountain blockchain API')
		.setVersion('1.0')
		.addTag('api')
		.build();
	const apiDocument = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/v1/docs', app, apiDocument);

	await app.listen(5000);
}
bootstrap();
