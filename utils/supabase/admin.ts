/**
 * Supabase Admin Client
 * Uses service role key to bypass Row Level Security (RLS)
 * Required for authentication and admin operations
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create admin Supabase client with service role key
 * This bypasses RLS policies and has full database access
 * Use ONLY on server-side, never expose service role key to client
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
