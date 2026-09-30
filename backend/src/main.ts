import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { swaggerBasicAuth } from './config/swagger-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: false });
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5174').split(','),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger: nunca em produção; em desenvolvimento, só com usuário e senha próprios.
  const docsUser = process.env.SWAGGER_USER;
  const docsPassword = process.env.SWAGGER_PASSWORD;
  if (process.env.NODE_ENV !== 'production' && docsUser && docsPassword) {
    app.use(
      ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
      swaggerBasicAuth(docsUser, docsPassword),
    );
    const doc = new DocumentBuilder()
      .setTitle('Restly Hub API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, doc),
    );
  }

  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  Logger.log(`Restly Hub API em http://localhost:${port}/api`, 'Bootstrap');
}
void bootstrap();
