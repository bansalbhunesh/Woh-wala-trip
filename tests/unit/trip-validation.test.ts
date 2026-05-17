import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the server-side schema to test validation rules
const TripCreateInput = z.object({
  name: z.string().min(2).max(80),
  destination: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const InviteCodeInput = z.object({
  inviteCode: z.string().min(6).max(8),
});

describe('TripCreateInput validation', () => {
  const valid = {
    name: 'Kasol 2024',
    destination: 'Himachal Pradesh',
    startDate: '2024-03-15',
    endDate: '2024-03-17',
  };

  it('accepts valid input', () => {
    expect(() => TripCreateInput.parse(valid)).not.toThrow();
  });

  it('rejects name shorter than 2 chars', () => {
    expect(() => TripCreateInput.parse({ ...valid, name: 'X' })).toThrow();
  });

  it('rejects name longer than 80 chars', () => {
    expect(() => TripCreateInput.parse({ ...valid, name: 'A'.repeat(81) })).toThrow();
  });

  it('accepts name exactly 2 chars', () => {
    expect(() => TripCreateInput.parse({ ...valid, name: 'AB' })).not.toThrow();
  });

  it('accepts name exactly 80 chars', () => {
    expect(() => TripCreateInput.parse({ ...valid, name: 'A'.repeat(80) })).not.toThrow();
  });

  it('accepts missing destination (optional)', () => {
    const { destination: _, ...withoutDest } = valid;
    expect(() => TripCreateInput.parse(withoutDest)).not.toThrow();
  });

  it('rejects malformed startDate (no dashes)', () => {
    expect(() => TripCreateInput.parse({ ...valid, startDate: '20240315' })).toThrow();
  });

  it('rejects malformed startDate (wrong format)', () => {
    expect(() => TripCreateInput.parse({ ...valid, startDate: '15-03-2024' })).toThrow();
  });

  it('rejects malformed endDate', () => {
    expect(() => TripCreateInput.parse({ ...valid, endDate: 'March 17 2024' })).toThrow();
  });

  it('accepts valid ISO date strings', () => {
    const result = TripCreateInput.parse({
      ...valid,
      startDate: '2025-01-01',
      endDate: '2025-01-03',
    });
    expect(result.startDate).toBe('2025-01-01');
  });
});

describe('InviteCodeInput validation', () => {
  it('accepts 6-char code', () => {
    expect(() => InviteCodeInput.parse({ inviteCode: 'ABC123' })).not.toThrow();
  });

  it('accepts 8-char code', () => {
    expect(() => InviteCodeInput.parse({ inviteCode: 'ABCD1234' })).not.toThrow();
  });

  it('accepts 7-char code', () => {
    expect(() => InviteCodeInput.parse({ inviteCode: 'ABC1234' })).not.toThrow();
  });

  it('rejects 5-char code (too short)', () => {
    expect(() => InviteCodeInput.parse({ inviteCode: 'AB123' })).toThrow();
  });

  it('rejects 9-char code (too long)', () => {
    expect(() => InviteCodeInput.parse({ inviteCode: 'ABCDE1234' })).toThrow();
  });

  it('rejects empty code', () => {
    expect(() => InviteCodeInput.parse({ inviteCode: '' })).toThrow();
  });
});

describe('email validation', () => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validEmails = [
    'user@example.com',
    'priya.sharma@gmail.com',
    'rohan+trips@outlook.com',
    'test123@subdomain.example.co.in',
  ];

  const invalidEmails = [
    '',
    'notanemail',
    '@missinglocal.com',
    'missing@tld',
    'spaces in@email.com',
  ];

  validEmails.forEach(email => {
    it(`accepts: ${email}`, () => {
      expect(EMAIL_RE.test(email)).toBe(true);
    });
  });

  invalidEmails.forEach(email => {
    it(`rejects: "${email}"`, () => {
      expect(EMAIL_RE.test(email)).toBe(false);
    });
  });
});

describe('phone E.164 validation (login)', () => {
  const E164_RE = /^\+[1-9]\d{9,14}$/;

  it('accepts +919876543210', () => {
    expect(E164_RE.test('+919876543210')).toBe(true);
  });

  it('accepts +14155552671', () => {
    expect(E164_RE.test('+14155552671')).toBe(true);
  });

  it('rejects +91 alone (no digits after country)', () => {
    expect(E164_RE.test('+91')).toBe(false);
  });

  it('rejects number with spaces', () => {
    expect(E164_RE.test('+91 98765 43210')).toBe(false);
  });

  it('rejects number with dashes', () => {
    expect(E164_RE.test('+91-9876543210')).toBe(false);
  });

  it('strips spaces and validates correctly after stripping', () => {
    const raw = '+91 98765 43210';
    const stripped = raw.replace(/[\s\-\(\)]/g, '');
    expect(E164_RE.test(stripped)).toBe(true);
  });

  it('rejects number too short after strip', () => {
    const raw = '+91 12345';
    const stripped = raw.replace(/[\s\-\(\)]/g, '');
    expect(E164_RE.test(stripped)).toBe(false);
  });
});
