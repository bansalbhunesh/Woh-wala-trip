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
        color: palette.inkSoft,
        letterSpacing: 4,
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
        color: palette.ink,
        lineHeight: 1.05,
        letterSpacing: -1.5,
        display: 'flex',
        flexWrap: 'wrap',
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
        fontSize: 40,
        fontFamily: 'Lora',
        fontStyle: 'italic',
        color: palette.inkSoft,
        lineHeight: 1.35,
        marginBottom: 'auto',
        maxWidth: 880,
      }}
    >
      &ldquo;{children}&rdquo;
    </div>
  );
}

export function ChaosScore({
  palette,
  score,
}: {
  palette: CardPalette;
  score: number;
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
          fontSize: 220,
          fontWeight: 500,
          color: palette.accent,
          lineHeight: 0.95,
          letterSpacing: -6,
        }}
      >
        {score}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 24,
        }}
      >
        <span style={{ fontSize: 30, color: palette.inkSoft, fontWeight: 500 }}>
          chaos score
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
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginTop: 60,
      }}
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <img src={qrDataUrl} width={140} height={140} alt="" />
        {qrLabel && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 22,
              color: palette.inkMuted,
              lineHeight: 1.3,
            }}
          >
            <span style={{ fontWeight: 500, color: palette.inkSoft }}>
              Scan to join
            </span>
            <span>or read the full lore</span>
          </div>
        )}
      </div>

      {showWatermark && (
        <div
          style={{
            fontSize: 22,
            color: palette.watermark,
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          wohwalatrip.app
        </div>
      )}
    </div>
  );
}
