import { existsSync } from 'fs';

if (!existsSync('node_modules')) {
  console.error('Dependencies not installed. Please run "npm install" or "pnpm install" before running this command.');
  process.exit(1);
}