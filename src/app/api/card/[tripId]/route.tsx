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

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const supabase = createSupabaseServiceClient();

    // 1. Parallelize initial data and font loading
    const origin = req.nextUrl.origin;

    const [tripResult, fonts] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      loadCardFonts(origin).catch(() => null),
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

    // Download variant — same card, forced download header
    if (isDownload) {
      const filename = `${(trip.name || 'trip').replace(/\s+/g, '-')}-lore-card.png`;
      const downloadCard = await renderCard(
        <CardFrame palette={palette}>
          <Eyebrow palette={palette}>Yaarlore</Eyebrow>
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
        { width: 1200, height: 630, fonts, filename }
      );
      return downloadCard;
    }

    // OG preview — standard 1200×630 landscape for WhatsApp/Twitter/OG tags.
    // Note: renderCard defaults to 1080×1920 (portrait).
    // Main trip OG card must explicitly request 1200×630 (landscape standard).
    // Without this, WhatsApp/Twitter previews show a blank/cropped portrait image.
    return renderCard(
      <CardFrame palette={palette}>
        <Eyebrow palette={palette}>Yaarlore</Eyebrow>
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
      { width: 1200, height: 630, fonts, cacheSeconds: 3600 }
    );
  } catch (err) {
    console.error('OG Route Error:', err);
    return errorImage('Critical render failure');
  }
}
