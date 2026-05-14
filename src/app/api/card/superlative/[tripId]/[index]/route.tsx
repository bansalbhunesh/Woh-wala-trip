import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { loadCardFonts } from '@/lib/og/fonts';
import { paletteFor } from '@/lib/og/colors';
import { qrDataUrl } from '@/lib/og/qr';
import { renderCard, errorImage } from '@/lib/og/render';
import { CardFrame, Eyebrow, CardFooter } from '@/lib/og/components';
import { MemberInitial, SuperlativeQuestion } from '@/lib/og/components-viral';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; index: string }> }
) {
  const { tripId, index } = await params;
  const idx = parseInt(index);
  const supabase = createSupabaseServiceClient();

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error || !trip || !trip.lore_json) {
    return errorImage('Trip lore not ready');
  }

  const lore = trip.lore_json as any;
  const superlative = lore.superlatives?.[idx];

  if (!superlative) {
    return errorImage('Superlative not found');
  }

  const palette = paletteFor(trip.chaos_score || 50);
  const origin = req.headers.get('origin');
  const [fonts, qr] = await Promise.all([
    loadCardFonts(origin),
    qrDataUrl(`${origin}/join/${trip.invite_code}`, {
      dark: palette.ink,
    }),
  ]);

  return renderCard(
    <CardFrame palette={palette}>
      <Eyebrow palette={palette}>{trip.name} / Awards</Eyebrow>

      <SuperlativeQuestion palette={palette}>{superlative.question}</SuperlativeQuestion>

      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 'auto' }}>
        <MemberInitial palette={palette} name={superlative.winner_name} size={180} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 32, color: palette.inkSoft }}>{superlative.archetype || 'Awarded to'}</div>
          <div style={{ fontSize: 72, fontWeight: 500 }}>{superlative.winner_name}</div>
        </div>
      </div>

      <CardFooter
        palette={palette}
        qrDataUrl={qr}
        showWatermark={trip.tier === 'free'}
        qrLabel="See who else won"
      />
    </CardFrame>,
    { fonts }
  );
}
