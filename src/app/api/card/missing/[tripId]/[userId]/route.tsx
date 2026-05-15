import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/server';
import { loadCardFonts } from '../../../../../../lib/og/fonts';
import { PALETTES } from '../../../../../../lib/og/colors';
import { qrDataUrl } from '../../../../../../lib/og/qr';
import { renderCard, errorImage } from '../../../../../../lib/og/render';
import { CardFrame, Title, CardFooter } from '../../../../../../lib/og/components';
import { MemberInitial, SignatureMove } from '../../../../../../lib/og/components-viral';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; userId: string }> }
) {
  const { tripId, userId } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: member, error } = await supabase
    .from('trip_members')
    .select('*, profiles:user_id(display_name), trips(*)')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  const m = member as any;
  if (error || !m || m.status !== 'absent') {
    return errorImage('User is not marked as absent');
  }

  const trip = m.trips;
  const palette = PALETTES.chaos; // Missing cards are always high-chaos alert themed
  const origin = req.headers.get('origin') ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const [fonts, qr] = await Promise.all([
    loadCardFonts(origin),
    qrDataUrl(`${origin}/trips/join?code=${trip.invite_code}`, {
      dark: palette.ink,
    }),
  ]);

  const displayName = m.profiles?.display_name || 'Anonymous';

  return renderCard(
    <CardFrame palette={palette}>
      <div
        style={{
          border: `2px dashed ${palette.accent}60`,
          borderRadius: 48,
          padding: 60,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Caution Tape Style Header */}
        <div
          style={{
            background: palette.accent,
            color: palette.bg,
            fontSize: 140,
            fontFamily: 'Space Grotesk',
            fontWeight: 800,
            textAlign: 'center',
            padding: '40px 0',
            margin: '-60px -60px 80px -60px',
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            letterSpacing: -4,
          }}
        >
          MISSING IN LORE
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
           <div style={{ position: 'relative' }}>
              <MemberInitial palette={palette} name={displayName} size={480} />
              <div style={{ 
                position: 'absolute', 
                bottom: -20, 
                right: -20, 
                background: '#fff', 
                border: `4px solid ${palette.accent}`,
                borderRadius: 20,
                padding: '12px 24px',
                fontSize: 32,
                fontFamily: 'Space Grotesk',
                fontWeight: 700,
                color: palette.accent
              }}>
                FOMO LEVEL: 100%
              </div>
           </div>
           
           <div style={{ textAlign: 'center', marginTop: 40 }}>
              <div style={{ fontSize: 40, fontFamily: 'Lora', fontStyle: 'italic', color: palette.inkSoft, marginBottom: 16 }}>
                Wanted for ghosting the group at
              </div>
              <div style={{ fontSize: 96, fontFamily: 'Lora', fontWeight: 600, color: palette.ink, lineHeight: 1, letterSpacing: -2 }}>
                {trip.name}
              </div>
           </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 60 }}>
          <div style={{ 
            fontSize: 36, 
            fontFamily: 'Space Grotesk', 
            color: palette.inkSoft, 
            marginBottom: 24,
            padding: '24px 32px',
            background: `${palette.accent}10`,
            borderRadius: 24,
            borderLeft: `8px solid ${palette.accent}`,
            lineHeight: 1.4
          }}>
            &ldquo;{m.absence_reason || 'Officially missing out on the best season of the lore.'}&rdquo;
          </div>

          <CardFooter
            palette={palette}
            qrDataUrl={qr}
            showWatermark={true}
            qrLabel="Scan to haunt them"
          />
        </div>
      </div>
    </CardFrame>,
    { fonts }
  );
}
