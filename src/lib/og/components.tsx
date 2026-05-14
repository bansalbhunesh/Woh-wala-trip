import React from 'react';
import type { CardPalette } from './colors';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;
export const CARD_PADDING_X = 88;
export const CARD_PADDING_TOP = 120;
export const CARD_PADDING_BOTTOM = 120;

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
        padding: `${CARD_PADDING_TOP}px ${CARD_PADDING_X}px ${CARD_PADDING_BOTTOM}px`,
        background: palette.bg,
        backgroundImage: `radial-gradient(circle at 0% 0%, ${palette.accent}08 0%, transparent 50%), radial-gradient(circle at 100% 100%, ${palette.accent}08 0%, transparent 50%)`,
        fontFamily: 'Inter',
        color: palette.ink,
        position: 'relative',
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
        fontSize: 30,
        fontFamily: 'Space Grotesk',
        color: palette.inkSoft,
        letterSpacing: 6,
        textTransform: 'uppercase',
        fontWeight: 500,
        marginBottom: 56,
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
  const fontSize = size === 'lg' ? 96 : 78;
  return (
    <div
      style={{
        fontSize,
        fontWeight: 500,
        fontFamily: 'Lora',
        color: palette.ink,
        lineHeight: 0.9,
        letterSpacing: -3,
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 48,
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
        fontSize: 48,
        fontFamily: 'Lora',
        fontStyle: 'italic',
        color: palette.inkSoft,
        lineHeight: 1.2,
        marginBottom: 'auto',
        maxWidth: 880,
      }}
    >
      &ldquo;{children}&rdquo;
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
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 24,
        marginTop: 80,
        marginBottom: 32,
      }}
    >
      <div
        style={{
          fontSize: 260,
          fontFamily: 'Space Grotesk',
          fontWeight: 700,
          color: palette.accent,
          lineHeight: 0.85,
          letterSpacing: -12,
        }}
      >
        {level}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 24,
        }}
      >
        <span style={{ fontSize: 30, color: palette.inkSoft, fontWeight: 500 }}>
          {verdict || 'how cooked?'}
        </span>
        <span style={{ fontSize: 22, color: palette.inkMuted }}>out of 100</span>
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
        fontSize: 32,
        color: palette.inkSoft,
        lineHeight: 1.4,
        maxWidth: 880,
        marginTop: 24,
      }}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  palette,
  qrDataUrl,
  showWatermark,
  qrLabel,
}: {
  palette: CardPalette;
  qrDataUrl: string;
  showWatermark: boolean;
  qrLabel?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 60,
        paddingTop: 60,
        borderTop: `1px solid ${palette.ink}15`,
      }}
    >
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <img src={qrDataUrl} width={160} height={160} style={{ borderRadius: 24 }} alt="" />
        {qrLabel && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 24,
              fontFamily: 'Space Grotesk',
              color: palette.inkSoft,
              lineHeight: 1.3,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            <span style={{ fontWeight: 600, color: palette.ink }}>
              Join the lore
            </span>
            <span style={{ opacity: 0.6 }}>Woh Wala Trip</span>
          </div>
        )}
      </div>

      {showWatermark && (
        <div
          style={{
            fontSize: 24,
            fontFamily: 'Space Grotesk',
            color: palette.watermark,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          wwt.app
        </div>
      )}
    </div>
  );
}
