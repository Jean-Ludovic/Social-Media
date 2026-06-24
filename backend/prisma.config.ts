import { defineConfig, env } from 'prisma/config';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  datasource: {
    url: env('DIRECT_URL'),
  },
});