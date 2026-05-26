/**
 * POST /api/webhook-gumroad
 *
 * Gumroad pings this URL on every sale (and refund).
 * On sale: creates a license record in Supabase.
 * On refund: revokes the license.
 *
 * Gumroad webhook body is form-encoded (application/x-www-form-urlencoded).
 *
 * Setup in Gumroad:
 *   Product Settings → Advanced → Ping URL → https://trimout-license.vercel.app/api/webhook-gumroad
 *
 * Security: validate GUMROAD_WEBHOOK_SECRET matches the "passphrase" Gumroad sends.
 * Set GUMROAD_WEBHOOK_SECRET env var in Vercel (any string you choose).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_db.js';

const WEBHOOK_SECRET = process.env['GUMROAD_WEBHOOK_SECRET'];

// Gumroad sends form-encoded data
function parseBody(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of body.split('&')) {
    const [k, ...rest] = pair.split('=');
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(rest.join('=') || '');
  }
  return result;
}

function generateKey(): string {
  // TRIM-XXXX-XXXX-XXXX-XXXX format (20 alphanum chars + 4 dashes)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/I/1
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `TRIM-${rand(4)}-${rand(4)}-${rand(4)}-${rand(4)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Parse form body (Vercel gives us a string when content-type is form-encoded)
  let rawBody: string;
  if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else {
    rawBody = Object.entries(req.body as Record<string, string>)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  }

  const data = parseBody(rawBody);

  // Verify passphrase if configured
  if (WEBHOOK_SECRET && data['passphrase'] !== WEBHOOK_SECRET) {
    console.warn('Invalid webhook passphrase');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const email = data['email'] ?? '';
  const saleId = data['sale_id'] ?? data['subscription_id'] ?? '';
  const productPermalink = data['product_permalink'] ?? '';
  const refunded = data['refunded'] === 'true';
  const chargebacked = data['chargebacked'] === 'true';

  console.log('[webhook-gumroad]', { email, saleId, refunded, chargebacked, productPermalink });

  if (refunded || chargebacked) {
    // Revoke the license for this sale
    const { error } = await db
      .from('licenses')
      .update({ revoked: true })
      .eq('gumroad_sale_id', saleId);

    if (error) console.error('Revoke error', error);
    return res.json({ ok: true, action: 'revoked' });
  }

  // New sale — determine max_activations from product variant or permalink
  // TrimOut convention: "solo" = 1 machine, everything else = 2 machines
  const maxActivations = productPermalink.toLowerCase().includes('solo') ? 1 : 2;

  // Generate unique key (retry on collision)
  let key = generateKey();
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const { data: collision } = await db.from('licenses').select('key').eq('key', key).single();
    if (!collision) break;
    key = generateKey();
  }

  const { error: insErr } = await db.from('licenses').insert({
    key,
    email,
    gumroad_sale_id: saleId,
    max_activations: maxActivations,
    created_at: new Date().toISOString(),
    revoked: false,
  });

  if (insErr) {
    console.error('Insert license error', insErr);
    return res.status(500).json({ ok: false, error: 'DB insert failed' });
  }

  // Gumroad does NOT send emails for us — you need to set up Gumroad's built-in
  // email receipt (Product → Content → "Thank you for buying!") to include the license key.
  // Since we can't email dynamically from Gumroad webhook, the recommended flow is:
  //   Option A: Use Gumroad's "Custom receipt" and a tool like Make.com / Zapier to email keys.
  //   Option B: Store key in Supabase and point user to a "retrieve key" page using their email.
  //
  // For now we log the key — in production, wire to your email provider (Resend, Postmark, etc.)
  console.log(`[webhook-gumroad] Created license key=${key} email=${email} saleId=${saleId}`);

  return res.json({ ok: true, key });
}
