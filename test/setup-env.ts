import { config } from 'dotenv';
import { join } from 'node:path';

// override: true memastikan .env.test mengalahkan DATABASE_URL dari shell atau .env.
config({ path: join(__dirname, '..', '.env.test'), override: true, quiet: true });

// Pengaman: tes mengosongkan tabel, jadi tolak database yang namanya tidak mengandung "test".
const databaseUrl = process.env.DATABASE_URL ?? '';
const databaseName = databaseUrl.split('?')[0].split('/').pop() ?? '';
if (!/test/i.test(databaseName)) {
  throw new Error(
    `Menolak menjalankan tes e2e: database "${databaseName}" tidak terlihat seperti database tes.`,
  );
}

process.env.THROTTLE_DISABLED = 'true';
process.env.SHIPPING_FEE = '15000';
process.env.BANK_TRANSFER_BANK_NAME = '';
process.env.BANK_TRANSFER_ACCOUNT_NAME = '';
process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '';