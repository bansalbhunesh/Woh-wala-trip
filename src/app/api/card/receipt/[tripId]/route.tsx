import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/server';
import { loadCardFonts } from '../../../../../lib/og/fonts';
import { paletteFor } from '../../../../../lib/og/colors';
import { qrDataUrl } from '../../../../../lib/og/qr';
import { renderCard, errorImage } from '../../../../../lib/og/render';
import { CardFrame, CardFooter } from '../../../../../lib/og/components';
import { ReceiptRow, DashedDivider } from '../../../../../lib/og/components-viral';

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
    return errorImage('Trip lore not ready');
  }

  const lore = trip.lore_json as any;
  const stats = lore.receipt_stats || [];

  if (stats.length === 0) {
    return errorImage('No stats found for receipt');
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
      <div
        style={{
          background: '#fff',
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 500,
            marginBottom: 8,
            fontFamily: 'monospace',
          }}
        >
          WOH WALA TRIP
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 24,
            marginBottom: 40,
            fontFamily: 'monospace',
          }}
        >
          *** ORDER #{(trip.id as string).slice(0, 8).toUpperCase()} ***
        </div>

        <DashedDivider />
        <div
          style={{
            padding: '20px 0',
            fontSize: 32,
            fontWeight: 500,
            fontFamily: 'monospace',
          }}
        >
          {trip.name.toUpperCase()}
        </div>
        <DashedDivider />

        <div style={{ display: 'flex', flexDirection: 'column', margin: '20px 0' }}>
          {stats.map((s: any, i: number) => (
            <ReceiptRow key={i} label={s.label.toUpperCase()} value={s.value} />
          ))}
        </div>

        <DashedDivider />
        <ReceiptRow label="CHAOS SCORE" value={trip.chaos_score || 0} emphasis />
        <DashedDivider />

        <div
          style={{
            textAlign: 'center',
            fontSize: 24,
            marginTop: 40,
            fontFamily: 'monospace',
            color: '#666',
          }}
        >
          THANK YOU FOR THE CHAOS
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 20,
            marginTop: 8,
            fontFamily: 'monospace',
            color: '#999',
          }}
        >
          {new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <CardFooter
          palette={palette}
          qrDataUrl={qr}
          showWatermark={trip.tier === 'free'}
          qrLabel="Scan to join"
        />
      </div>
    </CardFrame>,
    { fonts }
  );
}
