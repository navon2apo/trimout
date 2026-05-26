/**
 * POST /api/deactivate
 * Body: { key: string, machineId: string }
 *
 * Removes a machine activation, freeing a slot on the license.
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

  const { error } = await db
    .from('activations')
    .delete()
    .eq('license_key', cleanKey)
    .eq('machine_id', machineId);

  if (error) {
    console.error('Deactivate error', error);
    return err(res, 500, 'Server error while deactivating.');
  }

  return res.json({ ok: true });
}
