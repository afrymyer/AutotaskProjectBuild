import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

/**
 * Returns a Supabase client whose Authorization header is bound to the current
 * Clerk session JWT. Postgres validates the JWT against Clerk JWKS and
 * `auth.jwt() ->> 'sub'` is then available to RLS policies.
 */
export function useSupabase(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: async (input, init) => {
            const token = await getToken({ template: 'supabase' });
            const headers = new Headers(init?.headers);
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(input, { ...init, headers });
          },
        },
      }),
    [getToken],
  );
}
