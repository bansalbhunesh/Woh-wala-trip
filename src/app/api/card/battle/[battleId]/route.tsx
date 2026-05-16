import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/server';
import { loadCardFonts } from '../../../../../lib/og/fonts';
import { PALETTES } from '../../../../../lib/og/colors';
import { qrDataUrl } from '../../../../../lib/og/qr';
import { renderCard, errorImage } from '../../../../../lib/og/render';
import { CardFrame, Eyebrow, CardFooter } from '../../../../../lib/og/components';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  const { battleId } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: battle, error } = await supabase
    .from('trip_vs_trip' as never)
    .select(`
      *,
      trip_a:trip_a_id (*),
      trip_b:trip_b_id (*)
    `)
    .eq('id', battleId)
    .single();

  if (error || !battle) {
    return errorImage('Battle not found');
  }

  const b = battle as any;
  const tripA = b.trip_a;
  const tripB = b.trip_b;

  // Null-safe guard — joined trips may be missing
  if (!tripA || !tripB) return errorImage('Battle trip data incomplete');

  const maxScore = Math.max(tripA?.chaos_score ?? 0, tripB?.chaos_score ?? 0);
  const palette = maxScore >= 76 ? PALETTES.cooked : PALETTES.delusional;
  const origin = req.headers.get('origin') ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const [fonts, qr] = await Promise.all([
    loadCardFonts(origin).catch(() => null),
    qrDataUrl(`${origin}/trips/${tripA.id}`, { dark: palette.ink }),
  ]);
  if (!fonts) return errorImage('Failed to load fonts');

  return renderCard(
    <CardFrame palette={palette}>
      <Eyebrow palette={palette}>The Ultimate Showdown</Eyebrow>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 40,
            background: 'rgba(255,255,255,0.8)',
            borderRadius: 24,
            border: `4px solid ${palette.accent}`,
          }}
        >
          <div style={{ fontSize: 32, color: palette.inkSoft }}>Trip A</div>
          <div style={{ fontSize: 64, fontWeight: 500 }}>{tripA.name}</div>
          <div style={{ fontSize: 36, color: palette.accent, marginTop: 12 }}>
            Chaos: {tripA.chaos_score}/100
          </div>
        </div>

        <div
          style={{
            fontSize: 80,
            fontWeight: 500,
            textAlign: 'center',
            color: palette.accent,
            margin: '20px 0',
          }}
        >
          VS
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 40,
            background: 'rgba(255,255,255,0.8)',
            borderRadius: 24,
            border: `4px solid ${palette.ink}`,
          }}
        >
          <div style={{ fontSize: 32, color: palette.inkSoft }}>Trip B</div>
          <div style={{ fontSize: 64, fontWeight: 500 }}>{tripB.name}</div>
          <div style={{ fontSize: 36, color: palette.ink, marginTop: 12 }}>
            Chaos: {tripB.chaos_score}/100
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 48, fontWeight: 500 }}>Who had the better trip?</div>
        <div style={{ fontSize: 32, color: palette.inkSoft, marginTop: 8 }}>
          Vote now to settle the debate
        </div>
      </div>

      <CardFooter
        palette={palette}
        qrDataUrl={qr}
        showWatermark={true}
        qrLabel="Scan to vote"
      />
    </CardFrame>,
    { fonts }
  );
}
