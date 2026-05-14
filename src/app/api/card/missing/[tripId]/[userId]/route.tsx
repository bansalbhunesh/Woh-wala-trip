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
  const origin = req.headers.get('origin');
  const [fonts, qr] = await Promise.all([
    loadCardFonts(origin),
    qrDataUrl(`${origin}/join/${trip.invite_code}`, {
      dark: palette.ink,
    }),
  ]);

  const displayName = m.profiles?.display_name || 'Anonymous';

  return renderCard(
    <CardFrame palette={palette}>
      <div
        style={{
          border: `20px solid ${palette.accent}`,
          padding: 60,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            background: palette.accent,
            color: '#fff',
            fontSize: 120,
            fontWeight: 500,
            textAlign: 'center',
            padding: '20px 0',
            marginBottom: 60,
            letterSpacing: 10,
          }}
        >
          MISSING
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 60 }}>
          <MemberInitial palette={palette} name={displayName} size={400} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: palette.inkSoft, marginBottom: 16 }}>
            Last seen thinking about
          </div>
          <Title palette={palette}>{trip.name}</Title>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <SignatureMove palette={palette}>
            Reason for absence: {m.absence_reason || 'Skill issue / FOMO'}
          </SignatureMove>

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
