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
