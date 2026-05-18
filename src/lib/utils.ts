import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatName(name?: string | null) {
  if (!name) return 'Unknown';
  // Strip trailing numbers/domains (e.g., bhuneshbansal20039888 -> bhuneshbansal)
  const clean = name.replace(/[0-9]+.*$/, '').replace(/@.*$/, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1) || name;
}

/**
 * Nostalgia score formula — mirrors Python NostalgiaEngine._score.
 * Age bonus compounds with log(yearsAgo+1) so older memories score higher
 * than recent ones at the same chaos level.
 */
export function nostalgiaScore(chaosScore: number, yearsAgo: number): number {
  const ageBonus = 1 + Math.log1p(yearsAgo) * 0.5;
  return Math.round(chaosScore * ageBonus * 10) / 10;
}

/**
 * Normalise a raw invite code: trim whitespace, uppercase, cap at 8 characters.
 * Must stay in sync with the backend's join_trip_by_code RPC expectations.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 8);
}
