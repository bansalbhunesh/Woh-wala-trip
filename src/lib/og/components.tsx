import React from 'react';
import type { CardPalette } from './colors';

// Satori rules: every multi-child div needs display:flex, no position:relative,
// no multi-value backgroundImage, no negative letterSpacing, no marginBottom:'auto'

export function CardFrame({
  palette,
  children,
}: {
  palette: CardPalette;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '120px 88px',
        background: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.accent}18 100%)`,
        fontFamily: 'Inter',
        color: palette.ink,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({
  palette,
  children,
}: {
  palette: CardPalette;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 26,
        fontFamily: 'Space Grotesk',
        color: palette.inkSoft,
        letterSpacing: 5,
        textTransform: 'uppercase',
        fontWeight: 500,
        marginBottom: 48,
      }}
    >
      {children}
    </div>
  );
}

export function Title({
  palette,
  children,
  size = 'lg',
}: {
  palette: CardPalette;
  children: React.ReactNode;
  size?: 'lg' | 'md';
}) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: size === 'lg' ? 88 : 72,
        fontWeight: 500,
        fontFamily: 'Inter',
        color: palette.ink,
        lineHeight: 1,
        marginBottom: 36,
      }}
    >
      {children}
    </div>
  );
}

export function Tagline({
  palette,
  children,
}: {
  palette: CardPalette;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 42,
        fontFamily: 'Lora',
        fontStyle: 'italic',
        color: palette.inkSoft,
        lineHeight: 1.25,
        flexGrow: 1,
        maxWidth: 880,
      }}
    >
      {String.fromCharCode(8220)}
      {children}
      {String.fromCharCode(8221)}
    </div>
  );
}

export function CookedLevel({
  palette,
  level,
  verdict,
}: {
  palette: CardPalette;
  level: number;
  verdict?: string;
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginTop: 72, marginBottom: 28 }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 240,
          fontFamily: 'Space Grotesk',
          fontWeight: 700,
          color: palette.accent,
          lineHeight: 0.85,
        }}
      >
        {level}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 20, gap: 4 }}>
        <div style={{ display: 'flex', fontSize: 28, color: palette.inkSoft, fontWeight: 500 }}>
          {verdict || 'cooked'}
        </div>
        <div style={{ display: 'flex', fontSize: 20, color: palette.inkMuted }}>out of 100</div>
      </div>
    </div>
  );
}

export function Closing({
  palette,
  children,
}: {
  palette: CardPalette;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 30,
        color: palette.inkSoft,
        lineHeight: 1.4,
        maxWidth: 880,
        marginTop: 20,
      }}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  palette,
  qrDataUrl: inviteUrl,
  showWatermark,
  qrLabel,
}: {
  palette: CardPalette;
  qrDataUrl: string;
  showWatermark: boolean;
  qrLabel?: string;
}) {
  const code = inviteUrl.match(/code=([A-Z0-9]+)/)?.[1] || inviteUrl.split('/').pop() || '';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 48,
        paddingTop: 48,
        borderTop: `1px solid ${palette.inkSoft}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            fontFamily: 'Space Grotesk',
            color: palette.inkMuted,
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          {qrLabel || 'Join the archive'}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            fontFamily: 'Space Grotesk',
            fontWeight: 700,
            color: palette.accent,
            letterSpacing: 4,
          }}
        >
          {code}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            fontFamily: 'Space Grotesk',
            color: palette.inkMuted,
          }}
        >
          yaarlore.app
        </div>
      </div>
      {showWatermark && (
        <div
          style={{
            display: 'flex',
            fontSize: 20,
            fontFamily: 'Space Grotesk',
            color: palette.inkMuted,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          YL
        </div>
      )}
    </div>
  );
}
