import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/server';
import type { Database } from '../../../../../../lib/database.types';

type Member = Database['public']['Tables']['trip_members']['Row'];
type Trip = Database['public']['Tables']['trips']['Row'];
import { loadCardFonts } from '../../../../../../lib/og/fonts';
import { paletteFor } from '../../../../../../lib/og/colors';
import { qrDataUrl } from '../../../../../../lib/og/qr';
import { renderCard, errorImage } from '../../../../../../lib/og/render';
import { CardFrame, Eyebrow, Title, CardFooter } from '../../../../../../lib/og/components';
import { MemberInitial, SignatureMove, MetricBlock } from '../../../../../../lib/og/components-viral';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; memberId: string }> }
) {
  const { tripId, memberId } = await params;
  const supabase = createSupabaseServiceClient();
  const query = supabase
    .from('trip_members')
    .select('*, profiles:user_id(display_name), trips(*)')
    .eq('trip_id', tripId)
    .eq('user_id', memberId)
    .single();

  const { data, error } = await query;
  const member = data as (Member & { trips: Trip; profiles: { display_name: string } }) | null;

  if (error || !member || !member.role_title) {
    return errorImage('Member role not found');
  }

  const trip = member.trips as any; // Cast for the join
  const palette = paletteFor(trip?.chaos_score || 50);
  const origin = req.headers.get('origin') ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const [fonts, qr] = await Promise.all([
    loadCardFonts(origin),
    qrDataUrl(`${origin}/trips/join?code=${trip?.invite_code || ''}`, {
      dark: palette.ink,
    }),
  ]);

  const displayName = (member.profiles as any)?.display_name || 'Anonymous';

  return renderCard(
    <CardFrame palette={palette}>
      <Eyebrow palette={palette}>{trip.name} / Role</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 56 }}>
        <MemberInitial palette={palette} name={displayName} size={140} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 32, color: palette.inkSoft }}>{displayName} is the</div>
          <Title palette={palette} size="md">
            {member.role_title}
          </Title>
        </div>
      </div>

      <SignatureMove palette={palette}>{member.role_description}</SignatureMove>

      <MetricBlock
        palette={palette}
        value={member.role_chaos_rating || 0}
        outOf={10}
        label="chaos contribution"
      />

      <CardFooter
        palette={palette}
        qrDataUrl={qr}
        showWatermark={trip.tier === 'free'}
        qrLabel="Read the full lore"
      />
    </CardFrame>,
    { fonts }
  );
}
