import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { getBankTransferInstructions, getConfiguredShippingFee } from './store-config';

// Hash script inline di invoice (dokumen blob: mewarisi CSP halaman toko).
// Jika teks script di app.js diubah, hitung ulang hash-nya.
const INVOICE_PRINT_SCRIPT_HASH = "'sha256-NEavSrOqPGpTBj6XjMmtKp9LuZ1u4vR7yf/HvAPp9Kw='";

async function bootstrap(): Promise<void> {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  getConfiguredShippingFee();
  getBankTransferInstructions();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Di belakang reverse proxy (Nginx, Cloudflare, dll.), isi TRUST_PROXY dengan
  // jumlah proxy agar rate limit membaca IP pelanggan, bukan IP proxy.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    if (!Number.isInteger(hops) || hops < 1) {
      throw new Error('TRUST_PROXY must be a positive integer.');
    }
    app.set('trust proxy', hops);
  }

  // Helmet dipasang sebelum static assets agar file statis ikut mendapat header.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false, // menonaktifkan upgrade-insecure-requests yang merusak http://127.0.0.1
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", INVOICE_PRINT_SCRIPT_HASH],
          // 'unsafe-inline' untuk style saja: dibutuhkan chart admin (style="height:..%")
          // dan <style> di invoice. Script tetap ketat.
          styleSrc: ["'self'", "'unsafe-inline'"],
          // imageUrl produk boleh HTTP atau HTTPS, sesuai aturan di API.md.
          imgSrc: ["'self'", 'data:', 'http:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'public'));
  app.setGlobalPrefix('api/v1');

  const corsOrigins = (
    process.env.CORS_ORIGIN ??
    'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  app.enableCors({ origin: corsOrigins });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(port, host);

  console.log(`ShopSphere API listening at http://${host}:${port}/api/v1`);
}

void bootstrap();