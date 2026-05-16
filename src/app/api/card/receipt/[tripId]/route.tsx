import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadCardFonts } from '../../../../../lib/og/fonts';
import { paletteFor } from '../../../../../lib/og/colors';
import { qrDataUrl } from '../../../../../lib/og/qr';
import { renderCard, errorImage } from '../../../../../lib/og/render';
import { CardFrame, CardFooter } from '../../../../../lib/og/components';
import { ReceiptRow, DashedDivider } from '../../../../../lib/og/components-viral';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  const t = trip as any;
  if (error || !t || !t.lore_json) {
    return errorImage('Trip lore not ready');
  }

  const lore = t.lore_json;
  const stats = lore.receipt_stats || [];

  if (stats.length === 0) {
    return errorImage('No stats found for receipt');
  }

  const palette = paletteFor(t.chaos_score || 50);
  const origin = req.headers.get('origin') ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const [fonts, qr] = await Promise.all([
    loadCardFonts(origin),
    qrDataUrl(`${origin}/trips/join?code=${t.invite_code}`, {
      dark: palette.ink,
    }),
  ]);

  return renderCard(
    <CardFrame palette={palette}>
      <div
        style={{
          background: '#fff',
          padding: '80px 60px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
          borderRadius: 48,
          border: '1px solid #eef0f2',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Stripe-style accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: palette.accent }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 40, fontFamily: 'Space Grotesk', fontWeight: 700, color: palette.ink, letterSpacing: -1 }}>WWT LORE</div>
            <div style={{ fontSize: 24, fontFamily: 'Space Grotesk', color: palette.inkSoft, textTransform: 'uppercase', letterSpacing: 2 }}>Receipt of Downfall</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 24, fontFamily: 'Space Grotesk', color: palette.inkSoft }}>
            #{ (t.id as string).slice(0, 8).toUpperCase() }
          </div>
        </div>

        <div style={{ height: 1, background: '#eee', margin: '20px 0' }} />
        
        <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: 40 }}>
           {stats.map((s: any, i: number) => (
             <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ fontSize: 28, fontFamily: 'Space Grotesk', color: palette.inkSoft, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
               <div style={{ fontSize: 32, fontFamily: 'Space Grotesk', fontWeight: 600, color: palette.ink }}>{s.value}</div>
             </div>
           ))}
        </div>

        <div style={{ height: 1, background: '#eee', margin: '20px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
           <div style={{ fontSize: 36, fontFamily: 'Space Grotesk', fontWeight: 700, color: palette.ink }}>CHAOS TOTAL</div>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 80, fontFamily: 'Space Grotesk', fontWeight: 800, color: palette.accent, letterSpacing: -4 }}>{t.chaos_score || 0}</div>
              <div style={{ fontSize: 32, fontFamily: 'Space Grotesk', color: palette.inkSoft }}>/100</div>
           </div>
        </div>

        <div style={{ marginTop: 80, textAlign: 'center', fontSize: 20, fontFamily: 'Space Grotesk', color: palette.inkSoft, textTransform: 'uppercase', letterSpacing: 4 }}>
           Issued on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <CardFooter
          palette={palette}
          qrDataUrl={qr}
          showWatermark={t.tier === 'free'}
          qrLabel="Scan to join"
        />
      </div>
    </CardFrame>,
    { fonts }
  );
}
