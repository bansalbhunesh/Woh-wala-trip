import React from 'react';
import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { loadCardFonts } from '@/lib/og/fonts';
import { paletteFor } from '@/lib/og/colors';
import { renderCard, errorImage } from '@/lib/og/render';
import type { LoreJson } from '@/lib/types';

// Instagram Story format: 1080×1920 — the primary viral export format.
// This card is designed to be SCREENSHOTTED and FORWARDED, not just linked.
// Design principles:
// - Chaos score dominates the visual (that's the punchline)
// - One killer line from the lore (quotable, specific)
// - WhatsApp link at the bottom
// - Works as a standalone image with zero context needed

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const supabase = createSupabaseServiceClient();

    const [tripResult, fonts] = await Promise.all([
      supabase
        .from('trips')
        .select('name, invite_code, chaos_score, lore_json, tier')
        .eq('id', tripId)
        .single(),
      loadCardFonts(req.nextUrl.origin).catch(() => null),
    ]);

    if (!fonts) return errorImage('Design assets failed to load');
    const trip = tripResult.data as any;
    if (!trip?.lore_json) return errorImage('Lore not ready', 404);

    const lore = trip.lore_json as LoreJson;
    const chaos = (trip.chaos_score as number) ?? 70;
    const palette = paletteFor(chaos);

    // Pick the single most quotable line — the screenshot_moment_line is
    // specifically designed for this: "devastating accuracy, iconic"
    const heroLine = lore.screenshot_moment_line || lore.tagline || lore.opening_line || '';
    const verdict = lore.cooked_verdict || 'Historically Cooked';
    const tripTitle = lore.trip_title || trip.name || 'Unknown Trip';
    const storyUrl = `${req.nextUrl.origin}/t/${trip.invite_code}/story`;

    // Color scheme based on chaos level
    const bg = palette.bg;
    const ink = palette.ink;
    const accent = palette.accent;
    const inkSoft = palette.inkSoft;

    const card = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: bg,
          fontFamily: 'Inter',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top colored stripe — brand identifier */}
        <div style={{ display: 'flex', height: 8, background: accent }} />

        {/* Main content area — 80% of height */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '80px 80px 40px',
            gap: 0,
          }}
        >
          {/* Yaarlore mark */}
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: accent,
              letterSpacing: 8,
              textTransform: 'uppercase',
              marginBottom: 60,
              opacity: 0.7,
            }}
          >
            ● YAARLORE
          </div>

          {/* Trip title */}
          <div
            style={{
              display: 'flex',
              fontSize: 42,
              fontWeight: 700,
              color: inkSoft,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 16,
              textAlign: 'center',
              maxWidth: 900,
            }}
          >
            {tripTitle}
          </div>

          {/* THE BIG NUMBER — chaos score dominates */}
          <div
            style={{
              display: 'flex',
              fontSize: 260,
              fontWeight: 900,
              color: accent,
              lineHeight: 1,
              letterSpacing: -8,
              marginBottom: -20,
            }}
          >
            {chaos}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 400,
              color: inkSoft,
              letterSpacing: 12,
              textTransform: 'uppercase',
              marginBottom: 80,
            }}
          >
            / 100
          </div>

          {/* Verdict badge */}
          <div
            style={{
              display: 'flex',
              padding: '20px 48px',
              background: `${accent}15`,
              border: `2px solid ${accent}30`,
              borderRadius: 100,
              fontSize: 30,
              fontWeight: 700,
              color: accent,
              letterSpacing: 5,
              textTransform: 'uppercase',
              marginBottom: 80,
            }}
          >
            {verdict}
          </div>

          {/* The quotable line — the screenshot_moment_line */}
          {heroLine && (
            <div
              style={{
                display: 'flex',
                fontSize: 38,
                fontWeight: 600,
                color: ink,
                textAlign: 'center',
                lineHeight: 1.4,
                maxWidth: 880,
                fontStyle: 'italic',
                marginBottom: 40,
              }}
            >
              &ldquo;{heroLine}&rdquo;
            </div>
          )}
        </div>

        {/* Footer — link and call to action */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 80px 60px',
            gap: 16,
            borderTop: `1px solid ${accent}20`,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: accent,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            Generate yours →
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: inkSoft,
              letterSpacing: 2,
            }}
          >
            yaarlore.app
          </div>
        </div>

        {/* Subtle background pattern — chaos lines at low opacity */}
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `${accent}08`,
            display: 'flex',
          }}
        />
      </div>
    );

    return renderCard(card, {
      width: 1080,
      height: 1920,
      fonts,
      cacheSeconds: 3600,
    });
  } catch (err) {
    console.error('[story-card]', err);
    return errorImage('Failed to generate story card');
  }
}
