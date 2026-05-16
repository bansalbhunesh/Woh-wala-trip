import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
