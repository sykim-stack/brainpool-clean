/**
 * CoreHub Facts API client
 *
 * brainpool-clean이 번역/채팅 결과를 Fact으로 CoreHub에 전달하는 헬퍼.
 * CoreHub는 Fact를 받아 patterns 매칭 → connections → meanings → opportunities
 * 파이프라인을 실행한다. brainpool-clean은 판단/연결/의미 생성을 담당하지 않는다.
 *
 * CoreHub endpoint 검증 (Step 4):
 *   POST /api/corehub/facts → 200, fact_id 반환, processed: true auto-UPDATE
 */

const COREHUB_API_URL =
  process.env.COREHUB_API_URL || 'https://brainpool-corehub.vercel.app';

export interface CoreHubFactPayload {
  source: string;
  fact_type: string;
  owner_key: string;
  payload: Record<string, any>;
}

/**
 * Fact를 CoreHub facts API에 POST (fire-and-forget, fail-soft)
 *
 * brainpool-clean의 기존 번역/채팅 흐름에 영향을 주지 않는다.
 * CoreHub가 다운되거나 네트워크 오류가 발생해도
 * 번역 결과와 채팅 메시지는 정상적으로 처리된다.
 * 10초 timeout으로 hanging 방지.
 */
export async function postFactToCoreHub(
  fact: CoreHubFactPayload
): Promise<void> {
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