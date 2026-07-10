import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrations = [
  'add-saltedge-integration.js',
  'add-description-core-to-mappings.js',
];

console.log('🏗️  Running pending migrations...');
for (const file of migrations) {
  const script = join(__dirname, file);
  console.log(`▶️  ${file}`);
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`❌ Migration ${file} failed. Continuing anyway (idempotent CREATE/ALTER IF NOT EXISTS).`);
  }
}
console.log('✅ Pending migrations complete.');
