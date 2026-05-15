import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach((c) =>
              cookieStore.set(c.name, c.value, c.options)
            );
          } catch {
            // Server Component context — ignore
          }
        },
      },
    }
  );
}

/**
 * Service role client — bypasses RLS. Use only in trusted server contexts
 * like webhooks, OG image rendering, or AI worker callbacks. Never accept
 * user-controlled input that flows through this without verifying first.
 *
 * Uses the raw supabase-js client (not the SSR wrapper) so admin APIs work.
 */
export function createSupabaseServiceClient() {
  // Use raw supabase-js (not SSR wrapper) so auth.admin methods work correctly
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
