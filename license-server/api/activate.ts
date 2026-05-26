/**
 * POST /api/activate
 * Body: { key: string, machineId: string }
 *
 * Validates the license key, checks machine activation limit,
 * and registers this machine if under the limit.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_db.js';

const MAX_DEFAULT = 2;

function err(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ ok: false, error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');

  const { key, machineId } = req.body as { key?: string; machineId?: string };
  if (!key || !machineId) return err(res, 400, 'Missing key or machineId');

  const cleanKey = key.trim().toUpperCase();

  // 1. Look up the license
  const { data: license, error: licErr } = await db
    .from('licenses')
    .select('*')
    .eq('key', cleanKey)
    .single();

  if (licErr || !license) return err(res, 404, 'Invalid license key. Check the key and try again.');
  if (license.revoked) return err(res, 403, 'This license has been revoked. Contact support.');

  const maxActivations = license.max_activations ?? MAX_DEFAULT;

  // 2. Check if this machine is already activated
  const { data: existing } = await db
    .from('activations')
    .select('*')
    .eq('license_key', cleanKey)
    .eq('machine_id', machineId)
    .single();

  if (existing) {
    // Already activated on this machine — just refresh last_seen
    await db
      .from('activations')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.id);
    return res.json({ ok: true });
  }

  // 3. Count current activations
  const { count } = await db
    .from('activations')
    .select('*', { count: 'exact', head: true })
    .eq('license_key', cleanKey);

  if ((count ?? 0) >= maxActivations) {
    return err(
      res,
      403,
      `Maximum activations reached (${maxActivations} machines). Deactivate another machine at your account page, then try again.`,
    );
  }

  // 4. Register this machine
  const { error: insErr } = await db.from('activations').insert({
    license_key: cleanKey,
    machine_id: machineId,
    activated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  });

  if (insErr) {
    console.error('Insert activation error', insErr);
    return err(res, 500, 'Server error. Please try again.');
  }

  return res.json({ ok: true });
}
