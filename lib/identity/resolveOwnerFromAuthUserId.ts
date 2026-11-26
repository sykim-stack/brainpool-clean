// Resolve existing Platform Owner from Supabase Auth user id.
// Shared table: corenull_owner_identities (ADR-SHARED-OWNER-001).
// Policy: existing link only. Never create or merge Owner.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ResolveOwnerResult =
  | { ok: true; ownerKey: string }
  | { ok: false; error: 'invalid_subject' | 'owner_mapping_unavailable' | 'owner_link_required' };

/**
 * Look up owner_key for an Auth UID. No insert / merge.
 */
export async function resolveOwnerByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<ResolveOwnerResult> {
  if (typeof authUserId !== 'string' || !authUserId.trim()) {
    return { ok: false, error: 'invalid_subject' };
  }

  try {
    const { data, error } = await supabase
      .from('corenull_owner_identities')
      .select('owner_key')
      .eq('provider', 'supabase')
      .eq('provider_sub', authUserId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: 'owner_mapping_unavailable' };
    }

    if (data?.owner_key && typeof data.owner_key === 'string' && data.owner_key.trim()) {
      return { ok: true, ownerKey: data.owner_key.trim() };
    }

    const { data: alt, error: altError } = await supabase
      .from('corenull_owner_identities')
      .select('owner_key')
      .eq('provider', 'auth')
      .eq('provider_sub', authUserId)
      .maybeSingle();

    if (altError) {
      return { ok: false, error: 'owner_mapping_unavailable' };
    }

    if (alt?.owner_key && typeof alt.owner_key === 'string' && alt.owner_key.trim()) {
      return { ok: true, ownerKey: alt.owner_key.trim() };
    }

    return { ok: false, error: 'owner_link_required' };
  } catch {
    return { ok: false, error: 'owner_mapping_unavailable' };
  }
}
