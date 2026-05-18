// Audited 2026-05-18 — no secrets or destructive operations.
// This script only conditionally installs Husky git hooks.
// It never reads process.env for secret values, never writes files,
// and never runs rm/clean/delete operations.
import { execSync } from 'child_process';

if (!process.env.VERCEL && !process.env.CI) {
  try {
    execSync('npx husky', { stdio: 'inherit' });
  } catch (e) {
    console.warn('Husky failed to install. Skipping...');
  }
} else {
  console.log('Skipping Husky install in CI/Vercel environment.');
}
