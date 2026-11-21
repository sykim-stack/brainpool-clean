/**
 * CoreHub client (Facts + Opportunities)
 *
 * Facts: fire-and-forget POST (legacy path; still carries owner_key in body for now).
 * Opportunities: P4.3 / SHARED-OWNER-001
 *   - Client must NOT send owner_key / device_id / target_owner_* in query or body
 *   - Scope is derived from Authorization: Bearer (Supabase access token or CoreHub session)
 *   - Without a session token → skip call (avoid 400/401 console noise)
 */

const COREHUB_API_URL =
  process.env.NEXT_PUBLIC_COREHUB_API_URL ||
  process.env.COREHUB_API_URL ||
  'https://brainpool-corehub.vercel.app';

const OPPORTUNITIES_URL = `${COREHUB_API_URL}/api/corehub/opportunities`;

/** localStorage keys that may hold a CoreHub-usable Bearer token */
const SESSION_TOKEN_KEYS = [
  'corehub_session',
  'corehub_session_token',
  'bp_corehub_session',
] as const;

export interface CoreHubFactPayload {
  source: string;
  fact_type: string;
  owner_key: string;
  payload: Record<string, any>;
}

export type CoreHubOpportunityRaw = {
  id: string | number;
  action_type?: string;
  payload?: { message?: string; [k: string]: unknown };
  [k: string]: unknown;
};

export type CoreHubOpportunityItem = {
  id: string;
  label: string;
};

const OPPORTUNITY_LABEL: Record<string, string> = {
  'suggest.corering': '💬 번역 도움이 필요하신가요?',
  'trigger.hajunai.celebrate': '🍎 씨앗이 열매가 됐어요',
  'trigger.hajunai.nudge': '🌱 씨앗이 기다리고 있어요',
};

/**
 * Read CoreHub session / handoff token if present.
 * Does not invent identity — empty means "not logged in for CoreHub".
 */
export function readCoreHubSessionToken(): string {
  if (typeof window === 'undefined') return '';
  for (const key of SESSION_TOKEN_KEYS) {
    const v = localStorage.getItem(key)?.trim();
    if (v) return v;
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('sb-') || !k.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const access =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token;
      if (typeof access === 'string' && access.trim()) return access.trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

function bearerHeaders(extra?: Record<string, string>): Record<string, string> | null {
  const token = readCoreHubSessionToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

export async function postFactToCoreHub(fact: CoreHubFactPayload): Promise<void> {
  if (!fact.owner_key) {
    console.warn('[corehub] owner_key 누락 — Fact POST 건너뜀');
    return;
  }

  try {
    const response = await fetch(`${COREHUB_API_URL}/api/corehub/facts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fact),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(
        `[corehub] Fact POST 실패: ${response.status}`,
        await response.text()
      );
    }
  } catch (e: any) {
    console.warn('[corehub] Fact POST 예외 (무시):', e.message);
  }
}

export function mapCoreHubOpportunities(raw: CoreHubOpportunityRaw[]): CoreHubOpportunityItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).map((item) => ({
    id: String(item.id),
    label:
      OPPORTUNITY_LABEL[String(item.action_type || '')] ||
      (typeof item.payload?.message === 'string' ? item.payload.message : '') ||
      '발견',
  }));
}

/** GET opportunities under Bearer principal scope. No owner fields. */
export async function fetchCoreHubOpportunities(): Promise<CoreHubOpportunityRaw[]> {
  const headers = bearerHeaders();
  if (!headers) return [];

  try {
    const res = await fetch(OPPORTUNITIES_URL, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    if (!res) return [];
    if (res.status === 401 || res.status === 403) return [];
    if (!res.ok) {
      console.warn(`[corehub] opportunities GET ${res.status}`);
      return [];
    }

    const data = await res.json().catch(() => null);
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.payload?.opportunities)) return data.payload.opportunities;
    if (Array.isArray(data?.opportunities)) return data.opportunities;
    return [];
  } catch (e: any) {
    console.warn('[corehub] opportunities GET 예외:', e?.message || e);
    return [];
  }
}

/** PATCH consume opportunity. No owner fields in body/query. */
export async function dismissCoreHubOpportunity(
  opportunityId: string,
  outcome: string = 'dismissed'
): Promise<boolean> {
  const headers = bearerHeaders({ 'Content-Type': 'application/json' });
  if (!headers) return false;

  try {
    const res = await fetch(OPPORTUNITIES_URL, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        opportunity_id: opportunityId,
        outcome,
      }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    if (!res) return false;
    if (!res.ok) {
      console.warn(`[corehub] opportunities PATCH ${res.status}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('[corehub] opportunities PATCH 예외:', e?.message || e);
    return false;
  }
}
