/**
 * POST /api/status
 * Body: { key: string, machineId: string }
 *
 * Checks if the given machine is still authorized for this license.
 * Called on app startup to validate the cached license.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_db.js';

function err(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ ok: false, error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');

  const { key, machineId } = req.body as { key?: string; machineId?: string };
  if (!key || !machineId) return err(res, 400, 'Missing key or machineId');

  const cleanKey = key.trim().toUpperCase();

  // Check license exists and not revoked
  const { data: license } = await db
    .from('licenses')
    .select('revoked')
    .eq('key', cleanKey)
    .single();

  if (!license) return err(res, 404, 'License not found.');
  if (license.revoked) return err(res, 403, 'License revoked.');

  // Check this machine is activated
  const { data: activation } = await db
    .from('activations')
    .select('id')
    .eq('license_key', cleanKey)
    .eq('machine_id', machineId)
    .single();

  if (!activation) {
    return err(res, 403, 'This machine is not activated for this license. Please activate again.');
  }

  // Refresh last_seen (best-effort)
  void db
    .from('activations')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', activation.id);

  return res.json({ ok: true });
}
