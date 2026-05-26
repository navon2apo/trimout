/**
 * Supabase client singleton for the license server.
 * Uses env vars SUPABASE_URL and SUPABASE_SERVICE_KEY.
 *
 * Tables (see schema.sql):
 *   licenses(key, email, gumroad_sale_id, max_activations, created_at, revoked)
 *   activations(id, license_key, machine_id, activated_at, last_seen_at)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env['SUPABASE_URL']!;
const key = process.env['SUPABASE_SERVICE_KEY']!;

if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');

export const db = createClient(url, key, {
  auth: { persistSession: false },
});
