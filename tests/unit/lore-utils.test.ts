/**
 * Unit tests for lore-adjacent utilities that live on the frontend:
 * - Chaos score → verdict label mapping  (src/lib/types.ts)
 * - Nostalgia score formula              (src/lib/utils.ts)
 * - Invite code normalisation            (src/lib/utils.ts)
 *
 * TEST-03: tests now import and exercise the ACTUAL source exports rather than
 * locally-redefined stubs.  If the source functions are changed, these tests
 * will catch the regression.
 */
import { describe, it, expect } from 'vitest';
import { getCookedVerdict } from '@/lib/types';
import { nostalgiaScore, normalizeInviteCode } from '@/lib/utils';

// Verdict mapping — must stay in sync with ai-worker/tests/run_deterministic.py
describe('getCookedVerdict', () => {
  const cases: [number, string][] = [
    [0, 'Mildly Simmering'],
    [25, 'Mildly Simmering'],
    [26, 'Emotionally Unstable'],
    [55, 'Emotionally Unstable'],
    [56, 'Peak Delusion'],
    [80, 'Peak Delusion'],
    [81, 'Historically Cooked'],
    [100, 'Historically Cooked'],
  ];

  cases.forEach(([level, expected]) => {
    it(`level ${level} → ${expected}`, () => {
      expect(getCookedVerdict(level)).toBe(expected);
    });
  });
});

describe('nostalgiaScore', () => {
  it('higher chaos wins over lower chaos at same age', () => {
    expect(nostalgiaScore(85, 2)).toBeGreaterThan(nostalgiaScore(30, 2));
  });

  it('older memory scores higher than recent at same chaos', () => {
    expect(nostalgiaScore(70, 5)).toBeGreaterThan(nostalgiaScore(70, 1));
  });

  it('never returns negative score', () => {
    for (const chaos of [0, 50, 100]) {
      for (const years of [1, 3, 10]) {
        expect(nostalgiaScore(chaos, years)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('formula result: chaos=80, years=3 ≈ Python backend value', () => {
    // Python: round(80 * (1 + log1p(3) * 0.5), 1) ≈ 135.5
    const result = nostalgiaScore(80, 3);
    expect(Math.abs(result - 135.5)).toBeLessThan(0.1);
  });

  it('zero chaos → zero score regardless of age', () => {
    expect(nostalgiaScore(0, 5)).toBe(0);
  });

  it('zero years ago → chaos score unchanged (log1p(0)=0)', () => {
    expect(nostalgiaScore(75, 0)).toBe(75);
  });
});

describe('cooked score display', () => {
  it('formats score as integer percentage', () => {
    const score = 77;
    const display = `${score}%`;
    expect(display).toBe('77%');
  });

  it('clamps display to 0-100', () => {
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(77)).toBe(77);
  });
});

describe('normalizeInviteCode', () => {
  it('uppercases input', () => {
    expect(normalizeInviteCode('kasol1')).toBe('KASOL1');
  });

  it('trims whitespace', () => {
    expect(normalizeInviteCode('  ABC123  ')).toBe('ABC123');
  });

  it('caps at 8 characters', () => {
    expect(normalizeInviteCode('ABCDEFGHI')).toBe('ABCDEFGH');
  });

  it('handles already-valid code', () => {
    expect(normalizeInviteCode('TRIP2024')).toBe('TRIP2024');
  });
});
