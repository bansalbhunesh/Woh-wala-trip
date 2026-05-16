import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/server';
import { loadCardFonts } from '../../../../../lib/og/fonts';
import { renderCard, errorImage } from '../../../../../lib/og/render';

export const runtime = 'edge';

// Landscape OG card (1200×630) designed for WhatsApp / Twitter / Instagram link previews.
// Uses the curiosity-gap mechanic: chaos score is visible, lore excerpt is blurred/redacted.
// "X people know what really happened in [destination]" triggers FOMO and share intent.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const supabase = createSupabaseServiceClient();

    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    const t = trip as any;
    if (error || !t || !t.lore_json) {
      return errorImage('Story not ready yet');
    }

    const lore = t.lore_json;
    const chaos = t.chaos_score || lore.cooked_level || 60;
    const destination = t.destination || 'an undisclosed location';
    const memberCount = t.member_count || 0;
    const tripTitle = lore.trip_title || t.name || 'This Trip';
    const tagline = lore.tagline || '';
    // Take a short excerpt from act_1 — the most revealing part
    const excerpt = (lore.season_recap?.act_1 || lore.season_recap?.full_narrative || '').slice(0, 120);

    const origin = req.headers.get('origin')
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const fonts = await loadCardFonts(origin).catch(() => null);
    if (!fonts) return errorImage('Font load failed');

    const accentColor = chaos >= 76 ? '#FF4D4D' : chaos >= 51 ? '#D49E2D' : '#2D9E8B';

    return renderCard(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#060604',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter',
        }}
      >
        {/* Background glow — subtle radial emanating from chaos score */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 480,
            height: '100%',
            background: `radial-gradient(ellipse at 30% 50%, ${accentColor}18, transparent 70%)`,
          }}
        />

        {/* Thin top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: accentColor }} />

        {/* Left zone: chaos score */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 380,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '0 0 0 64px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: `${accentColor}60`,
              marginBottom: 16,
              fontFamily: 'Inter',
            }}
          >
            AI Chaos Score
          </div>
          <div
            style={{
              fontSize: 160,
              fontWeight: 700,
              lineHeight: 1,
              color: accentColor,
              letterSpacing: -6,
              fontFamily: 'Inter',
              textShadow: `0 0 80px ${accentColor}40`,
            }}
          >
            {chaos}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: `${accentColor}80`,
              marginTop: 8,
              fontFamily: 'Inter',
            }}
          >
            / 100 possible chaos units
          </div>
        </div>

        {/* Vertical divider */}
        <div
          style={{
            position: 'absolute',
            left: 380,
            top: 60,
            bottom: 60,
            width: 1,
            background: 'rgba(245,240,232,0.06)',
          }}
        />

        {/* Right zone: trip identity + teaser */}
        <div
          style={{
            position: 'absolute',
            left: 420,
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 64px 0 0',
          }}
        >
          {/* Destination label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.25)',
              marginBottom: 16,
              fontFamily: 'Inter',
            }}
          >
            {destination}
          </div>

          {/* Trip title */}
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              lineHeight: 1.1,
              color: 'rgba(245,240,232,0.92)',
              letterSpacing: -1,
              marginBottom: 12,
              fontFamily: 'Inter',
            }}
          >
            {tripTitle.length > 42 ? tripTitle.slice(0, 42) + '…' : tripTitle}
          </div>

          {/* Tagline */}
          {tagline && (
            <div
              style={{
                fontSize: 16,
                fontStyle: 'italic',
                color: 'rgba(245,240,232,0.40)',
                marginBottom: 28,
                fontFamily: 'Inter',
                lineHeight: 1.4,
              }}
            >
              &ldquo;{tagline.length > 80 ? tagline.slice(0, 80) + '…' : tagline}&rdquo;
            </div>
          )}

          {/* Redacted excerpt — blur + bars show there's content but hide it */}
          {excerpt && (
            <div
              style={{
                fontSize: 14,
                color: 'rgba(245,240,232,0.12)',
                lineHeight: 1.6,
                marginBottom: 28,
                fontFamily: 'Inter',
                filter: 'blur(5px)',
                userSelect: 'none',
              }}
            >
              {excerpt}
            </div>
          )}

          {/* FOMO hook */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              background: `${accentColor}10`,
              border: `1px solid ${accentColor}25`,
              borderRadius: 12,
              marginBottom: 0,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accentColor,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: `${accentColor}90`,
                letterSpacing: '0.05em',
                fontFamily: 'Inter',
              }}
            >
              {memberCount > 0
                ? `${memberCount} people were there. Only they know what really happened.`
                : 'Only the people there know what really happened.'}
            </div>
          </div>
        </div>

        {/* Bottom watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 64,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.15)',
            fontFamily: 'Inter',
          }}
        >
          yaarlore.app
        </div>
      </div>,
      { fonts, width: 1200, height: 630, cacheSeconds: 3600 }
    );
  } catch (err) {
    console.error('[share card] render error:', err);
    return errorImage('Share card render failed');
  }
}
