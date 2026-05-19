import React from 'react';
import type { CardPalette } from './colors';

export function MemberInitial({
  palette,
  name,
  size = 120,
}: {
  palette: CardPalette;
  name: string;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: palette.accent + '20',
        border: `2px solid ${palette.accent}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 500,
        color: palette.accent,
      }}
    >
      {initials}
    </div>
  );
}

export function SignatureMove({
  palette,
  children,
}: {
  palette: CardPalette;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: 44,
        fontFamily: 'Lora',
        fontStyle: 'italic',
        color: palette.inkSoft,
        lineHeight: 1.3,
        maxWidth: 880,
        marginBottom: 40,
      }}
    >
      &ldquo;{children}&rdquo;
    </div>
  );
}

export function MetricBlock({
  palette,
  value,
  outOf,
  label,
}: {
  palette: CardPalette;
  value: number | string;
  outOf?: number;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
      <div
        style={{
          fontSize: 220,
          fontFamily: 'Space Grotesk',
          fontWeight: 700,
          color: palette.accent,
          lineHeight: 0.85,
          letterSpacing: -12,
        }}
      >
        {value}
        {outOf && (
          <span
            style={{ fontSize: 100, color: palette.inkMuted, fontWeight: 500, letterSpacing: -4 }}
          >
            /{outOf}
          </span>
        )}
      </div>
      <div
        style={{
          paddingBottom: 24,
          fontSize: 32,
          fontFamily: 'Space Grotesk',
          fontWeight: 500,
          color: palette.inkSoft,
          textTransform: 'uppercase',
          letterSpacing: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function ReceiptRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: emphasis ? 36 : 30,
        fontWeight: emphasis ? 500 : 400,
        fontFamily: 'monospace',
        color: '#1a1a1a',
        padding: '14px 0',
        borderBottom: emphasis ? '1px dashed #888780' : 'none',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function DashedDivider() {
  return (
    <div
      style={{
        height: 1,
        borderTop: '1.5px dashed #888780',
        margin: '8px 0',
      }}
    />
  );
}

export function SuperlativeQuestion({
  palette,
  children,
}: {
  palette: CardPalette;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 56 }}>
      <div
        style={{
          fontSize: 30,
          color: palette.inkSoft,
          fontFamily: 'Lora',
          fontStyle: 'italic',
          marginBottom: 16,
        }}
      >
        most likely to
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 500,
          color: palette.ink,
          lineHeight: 1.1,
          letterSpacing: -1,
          maxWidth: 880,
        }}
      >
        {children}
      </div>
    </div>
  );
}
