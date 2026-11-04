import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

// Read DATABASE_URL from environment or .env
let dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (match) {
    dbUrl = match[1];
  }
}

const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const targetSchema = isPostgres ? 'schema.neon.prisma' : 'schema.sqlite.prisma';
const sourcePath = path.join(rootDir, 'prisma', targetSchema);
const destPath = path.join(rootDir, 'prisma', 'schema.prisma');

console.log(`[db-setup] Database URL type: ${isPostgres ? 'Neon / PostgreSQL' : 'Local SQLite'}`);
console.log(`[db-setup] Syncing prisma/schema.prisma from ${targetSchema}...`);

if (fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, destPath);
  console.log('[db-setup] Schema successfully synchronized.');
} else {
  console.error(`[db-setup] Target schema file not found: ${sourcePath}`);
  process.exit(1);
}

try {
  console.log('[db-setup] Running Prisma Client generation...');
  execSync('bun x prisma generate', { stdio: 'inherit' });
  console.log('[db-setup] Prisma Client generated successfully.');
} catch (err) {
  console.error('[db-setup] Error during prisma generate:', err);
  process.exit(1);
}
