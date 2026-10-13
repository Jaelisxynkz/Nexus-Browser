import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Central entitlement resolver. Single source of truth for Premium features.
// Reads the caller's Entitlement record (admin-managed). Never trusts client flags.
const PREMIUM_FEATURES = [
  'VPN_PREMIUM', 'AI_PREMIUM', 'CLOUD_SYNC', 'PREMIUM_THEMES',
  'PREMIUM_AUDIO', 'ADVANCED_WORKSPACES', 'NEXUS_SHIELD',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await base44.asServiceRole.entities.Entitlement.filter({ created_by_id: user.id });
    const ent = rows[0] || null;
    const now = Date.now();
    const expired = ent?.expiresAt ? new Date(ent.expiresAt).getTime() < now : false;
    const active = !!ent && ent.status === 'active' && !expired;
    const plan = active ? (ent.plan || 'free') : 'free';

    const features = active && plan === 'premium'
      ? (Array.isArray(ent.features) && ent.features.length ? ent.features : PREMIUM_FEATURES)
      : [];

    return Response.json({
      plan,
      status: ent ? (expired ? 'expired' : ent.status) : 'none',
      active,
      expiresAt: ent?.expiresAt || null,
      features,
      has: (f) => features.includes(f),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}