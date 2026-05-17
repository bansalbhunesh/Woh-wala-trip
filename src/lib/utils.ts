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
