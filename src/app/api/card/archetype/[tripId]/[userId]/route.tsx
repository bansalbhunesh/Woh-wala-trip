import React from 'react';
import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { loadCardFonts } from '@/lib/og/fonts';
import { renderCard, errorImage } from '@/lib/og/render';

// Archetype share card: "bro this is literally you" format.
// Per-person portrait card showing their behavioral profile from the trip.
// This is the highest-virality artifact — the moment someone sees their
// specific archetype descriptor, they immediately forward it to the group.
//
// Design: dark background, person's name large, archetype descriptor
// as the dominant text, chaos rating, and one behavioral quote.

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; userId: string }> }
) {
  try {
    const { tripId, userId } = await params;
    const supabase = createSupabaseServiceClient();

    const [memberResult, tripResult, fonts] = await Promise.all([
      supabase
        .from('trip_members')
        .select(
          'display_name, role_title, role_description, role_chaos_rating, archetype, archetype_tag, most_likely_said, signature_move'
        )
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('trips')
        .select('name, invite_code, chaos_score, lore_json')
        .eq('id', tripId)
        .single(),
      loadCardFonts(req.nextUrl.origin).catch(() => null),
    ]);

    if (!fonts) return errorImage('Design assets failed to load');
    const member = memberResult.data as any;
    const trip = tripResult.data as any;
    if (!member || !trip) return errorImage('Member or trip not found', 404);

    const chaosRating = (member.role_chaos_rating as number) ?? 5;
    const name = (member.display_name as string) || 'Unknown';
    const roleTitle = (member.role_title as string) || 'Group Member';
    const archetype = (member.archetype as string) || 'Group Contributor';
    const mostLikelySaid = (member.most_likely_said as string) || null;
    const tripTitle = (trip.lore_json as any)?.trip_title || (trip.name as string);

    // Chaos bar colors: low = teal, medium = amber, high = red
    const chaosColor = chaosRating >= 8 ? '#FF4D4D' : chaosRating >= 5 ? '#D49E2D' : '#2D9E8B';
    const bg = '#060604';
    const ink = '#F5F0E8';

    const card = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: bg,
          fontFamily: 'Inter',
          padding: '80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: `${chaosColor}12`,
            display: 'flex',
          }}
        />

        {/* YAARLORE mark */}
        <div
          style={{
            display: 'flex',
            fontSize: 20,
            color: `${chaosColor}80`,
            letterSpacing: 8,
            textTransform: 'uppercase',
            marginBottom: 100,
          }}
        >
          ● YAARLORE · CHARACTER FILE
        </div>

        {/* Person's name — large */}
        <div
          style={{
            display: 'flex',
            fontSize: 120,
            fontWeight: 900,
            color: ink,
            letterSpacing: -4,
            lineHeight: 0.9,
            marginBottom: 40,
          }}
        >
          {name}
        </div>

        {/* Trip context */}
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: `${ink}50`,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 80,
          }}
        >
          {tripTitle}
        </div>

        {/* Role title — the behavioral descriptor */}
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 900,
            color: chaosColor,
            lineHeight: 1.1,
            maxWidth: 900,
            marginBottom: 40,
          }}
        >
          {roleTitle}
        </div>

        {/* Archetype tag */}
        <div
          style={{
            display: 'flex',
            padding: '16px 32px',
            background: `${chaosColor}12`,
            border: `1px solid ${chaosColor}30`,
            borderRadius: 100,
            fontSize: 24,
            color: chaosColor,
            letterSpacing: 4,
            textTransform: 'lowercase',
            marginBottom: 80,
            width: 'fit-content',
          }}
        >
          {archetype}
        </div>

        {/* Chaos rating bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 80 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 22,
              color: `${ink}40`,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            <span>Chaos Rating</span>
            <span style={{ color: chaosColor, fontWeight: 900 }}>{chaosRating}/10</span>
          </div>
          <div
            style={{
              display: 'flex',
              height: 8,
              background: `${ink}10`,
              borderRadius: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: `${chaosRating * 10}%`,
                background: chaosColor,
                borderRadius: 100,
              }}
            />
          </div>
        </div>

        {/* Most likely said — the "bro this is literally you" moment */}
        {mostLikelySaid && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '40px',
              background: `${chaosColor}08`,
              border: `1px solid ${chaosColor}15`,
              borderRadius: 24,
              marginBottom: 60,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                color: `${chaosColor}60`,
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Most likely said
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 36,
                fontWeight: 600,
                color: ink,
                fontStyle: 'italic',
                lineHeight: 1.3,
              }}
            >
              &ldquo;{mostLikelySaid}&rdquo;
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: `${ink}25`,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            yaarlore.app
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: chaosColor,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            Generate yours →
          </div>
        </div>
      </div>
    );

    return renderCard(card, {
      width: 1080,
      height: 1920,
      fonts,
      cacheSeconds: 3600,
    });
  } catch (err) {
    console.error('[archetype-card]', err);
    return errorImage('Failed to generate archetype card');
  }
}
