import { ImageResponse } from 'next/og';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get('tripId');
    
    if (!tripId) {
      return new Response('Missing tripId', { status: 400 });
    }
    
    const supabase = createSupabaseServiceClient();
    const { data: trip } = await supabase
      .from('trips')
      .select('name, destination, chaos_score, lore_json, tier')
      .eq('id', tripId)
      .single();
    
    if (!trip?.lore_json) {
      // Fallback for demo if DB isn't ready
      return new ImageResponse(
        (
          <div style={{ 
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', 
            padding: 80, background: '#FAF8F4', fontFamily: 'sans-serif' 
          }}>
            <div style={{ fontSize: 40, color: '#888', marginBottom: 20 }}>DEMO MODE</div>
            <div style={{ fontSize: 100, fontWeight: 'bold', color: '#1a1a1a' }}>Trip Card</div>
            <div style={{ fontSize: 40, color: '#444', fontStyle: 'italic', marginTop: 40 }}>
              "Real card will render once lore is generated in Supabase."
            </div>
          </div>
        ),
        { width: 1080, height: 1920 }
      );
    }
    
    const lore = trip.lore_json as any;
    const isFree = trip.tier === 'free';
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '120px 80px',
            background: '#FAF8F4',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 32, color: '#888', marginBottom: 12, letterSpacing: 2, fontWeight: 500 }}>
            {trip.destination?.toUpperCase() || 'A TRIP'}
          </div>
          <div style={{
            fontSize: 110,
            lineHeight: 1,
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: 40,
            maxWidth: 900,
          }}>
            {lore.trip_title}
          </div>
          <div style={{
            fontSize: 48,
            color: '#666',
            fontStyle: 'italic',
            maxWidth: 800,
            marginBottom: 80,
            lineHeight: 1.4,
          }}>
            "{lore.tagline}"
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <div style={{ fontSize: 180, fontWeight: 700, color: '#1a1a1a', letterSpacing: -10 }}>
                {trip.chaos_score}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: '#1a1a1a' }}>CHAOS</div>
                <div style={{ fontSize: 24, color: '#888' }}>SCORE / 100</div>
              </div>
            </div>
            
            <div style={{ fontSize: 32, color: '#444', marginTop: 60, maxWidth: 800, lineHeight: 1.5 }}>
              {lore.closing_line}
            </div>
          </div>
          
          {isFree && (
            <div style={{
              position: 'absolute',
              bottom: 60,
              right: 80,
              fontSize: 24,
              color: '#BBB',
              fontWeight: 500,
              letterSpacing: 1,
            }}>
              WOHWALATRIP.APP
            </div>
          )}
          
          {/* Decorative element */}
          <div style={{
            position: 'absolute',
            top: 80,
            right: 80,
            width: 120,
            height: 120,
            borderRadius: 60,
            background: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 40,
          }}>
            WWT
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
      },
    );
  } catch (err: any) {
    return new Response(`Failed to render image: ${err.message}`, { status: 500 });
  }
}
