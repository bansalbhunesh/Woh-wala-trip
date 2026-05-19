import React from 'react';
import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { loadCardFonts } from '@/lib/og/fonts';
import { renderCard, errorImage } from '@/lib/og/render';

export const runtime = 'edge';

interface WrapJson {
  headline?: string;
  chaos_average?: number;
  trip_count?: number;
  top_destination?: string;
  year_verdict?: string;
  era_title?: string;
  superlative?: string;
  chaos_tier?: string;
  destinations?: string[];
}

type Params = { userId: string; year: string };

export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { userId, year: yearStr } = await params;
    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 2020 || year > 2030) {
      return errorImage('Invalid year', 400);
    }

    const [wrapResult, fonts] = await Promise.all([
      createSupabaseServiceClient()
        .from('yearly_wraps')
        .select('wrap_json')
        .eq('user_id', userId)
        .eq('year', year)
        .maybeSingle(),
      loadCardFonts(req.nextUrl.origin).catch(() => null),
    ]);

    if (!fonts) return errorImage('Failed to load design assets');

    const wj = (wrapResult.data?.wrap_json ?? {}) as WrapJson;
    const accent = '#FF4D4D';
    const inkSoft = 'rgba(245,240,232,0.45)';
    const ink = '#F5F0E8';
    const bg = '#0a0a08';

    const card = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 50% 30%, ${accent}18 0%, ${bg} 65%)`,
          padding: '80px',
          fontFamily: 'Inter',
          color: ink,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            fontSize: 20,
            color: `${accent}80`,
            letterSpacing: 8,
            textTransform: 'uppercase',
            marginBottom: 40,
          }}
        >
          ● YAARLORE {year} WRAP
        </div>

        {/* Era title */}
        {wj.era_title && (
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: inkSoft,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            &ldquo;{wj.era_title}&rdquo;
          </div>
        )}

        {/* Headline */}
        {wj.headline && (
          <div
            style={{
              display: 'flex',
              fontSize: 52,
              fontWeight: 900,
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 60,
              maxWidth: 900,
            }}
          >
            {wj.headline}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 60 }}>
          {[
            { label: 'Trips', value: String(wj.trip_count ?? '—') },
            {
              label: 'Avg Chaos',
              value: wj.chaos_average != null ? `${wj.chaos_average}/100` : '—',
            },
            { label: 'Chaos Tier', value: wj.chaos_tier ?? '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '32px 48px',
                background: 'rgba(245,240,232,0.04)',
                border: '1px solid rgba(245,240,232,0.08)',
                borderRadius: 24,
                minWidth: 180,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 16,
                  color: 'rgba(245,240,232,0.3)',
                  letterSpacing: 5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                {label}
              </div>
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 900, color: accent }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Destinations */}
        {wj.destinations && wj.destinations.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
            {wj.destinations.slice(0, 4).map(d => (
              <div
                key={d}
                style={{
                  display: 'flex',
                  padding: '10px 24px',
                  borderRadius: 100,
                  background: 'rgba(245,240,232,0.06)',
                  border: '1px solid rgba(245,240,232,0.1)',
                  fontSize: 20,
                  color: 'rgba(245,240,232,0.55)',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                }}
              >
                {d}
              </div>
            ))}
          </div>
        )}

        {/* Footer brand */}
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            color: 'rgba(245,240,232,0.2)',
            letterSpacing: 8,
            textTransform: 'uppercase',
            marginTop: 20,
          }}
        >
          YAARLORE · AI FRIENDSHIP ARCHIVE
        </div>
      </div>
    );

    return renderCard(card, {
      width: 1080,
      height: 1080,
      fonts,
      cacheSeconds: 300,
    });
  } catch (err) {
    console.error('[wrap-card]', err);
    return errorImage('Failed to generate wrap card');
  }
}
