import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/server';
import { loadCardFonts } from '../../../../lib/og/fonts';
import { paletteFor } from '../../../../lib/og/colors';
import { qrDataUrl } from '../../../../lib/og/qr';
import { renderCard, errorImage } from '../../../../lib/og/render';
import {
  CardFrame,
  Eyebrow,
  Title,
  Tagline,
  CookedLevel,
  Closing,
  CardFooter,
} from '../../../../lib/og/components';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error || !trip || !trip.lore_json) {
    return errorImage('Trip not found or lore not ready');
  }

  const lore = trip.lore_json as any;
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
      <Eyebrow palette={palette}>Woh Wala Trip</Eyebrow>
      <Title palette={palette}>{lore.trip_title}</Title>
      <Tagline palette={palette}>{lore.tagline}</Tagline>
      <CookedLevel 
        palette={palette} 
        level={trip.chaos_score || 0} 
        verdict={lore.cooked_verdict}
      />
      <Closing palette={palette}>{lore.closing_line}</Closing>
      <CardFooter
        palette={palette}
        qrDataUrl={qr}
        showWatermark={trip.tier === 'free'}
        qrLabel="Scan to join"
      />
    </CardFrame>,
    { fonts }
  );
}
