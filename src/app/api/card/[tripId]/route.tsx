import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/server';
import type { Database } from '../../../../lib/database.types';

type Trip = Database['public']['Tables']['trips']['Row'];
import { loadCardFonts } from '../../../../lib/og/fonts';
import { paletteFor } from '../../../../lib/og/colors';
import { LoreJson } from '../../../../lib/types';
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

// Node runtime — edge runtime has issues with require() in createSupabaseServiceClient
export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const supabase = createSupabaseServiceClient();
    
    // 1. Parallelize initial data and font loading
    const origin = req.headers.get('origin') || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const [tripResult, fonts] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      loadCardFonts(origin).catch(() => null)
    ]);

    const { data, error: tripError } = tripResult;
    const trip = data as Trip | null;

    if (tripError || !trip || !trip.lore_json) {
      return errorImage('Trip lore not ready or missing');
    }

    if (!fonts) {
      return errorImage('Failed to load design assets');
    }

    const lore = trip.lore_json as unknown as LoreJson;
    const palette = paletteFor(trip.chaos_score || 50);

    // 2. Fetch QR code (depends on trip data)
    const qr = await qrDataUrl(`${origin}/trips/join?code=${trip.invite_code}`, {
      dark: palette.ink,
    });

    const isDownload = req.nextUrl.searchParams.get('download') === '1';

    const imgResponse = await renderCard(
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

    if (isDownload) {
      const filename = `${(trip.name || 'trip').replace(/\s+/g, '-')}-lore-card.png`;
      const buf = await imgResponse.arrayBuffer();
      return new Response(buf, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return imgResponse;
  } catch (err) {
    console.error('OG Route Error:', err);
    return errorImage('Critical render failure');
  }
}
