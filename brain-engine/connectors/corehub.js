// brain-engine/connectors/corehub.js
//
// CoreHub 스키마 (connections, meanings, opportunities)에 접근하는 헬퍼.
// brainpool-clean은 판단/연결/의미 생성을 담당하지 않고 CoreHub가 담당한다.
// 이 모듈은 CoreHub가 만든 결과를 조회하여 HajunAI 컨텍스트로 브리지한다.
//
// CoreHub Facts API POST → runPipeline → connections → meanings → opportunities
// (Step 4에서 end-to-end 검증 완료)

import { getStorage } from './storage.js';

/**
 * owner_key로 CoreHub 결과를 조회하여 컨텍스트로 반환.
 *
 * @param {string} ownerKey - CoreHub facts의 owner_key (device_id/userId)
 * @returns {{ opportunities: any[], meanings: any[], connections: any[] }}
 *
 * 설계 원칙:
 * - fail-soft: DB 조회 실패 시 빈 배열 반환 (HajunAI는 기존대로 동작)
 * - expired 결과 제외 (expires_at > now)
 * - opportunities는 priority 내림차순 (high > medium > low)
 * - meanings는 confidence 내림차순
 * - connections는 strength 내림차순
 */
export async function fetchContext(ownerKey) {
  if (!ownerKey) return { opportunities: [], meanings: [], connections: [] };

  const db = await getStorage();
  if (!db) return { opportunities: [], meanings: [], connections: [] };

  const now = new Date().toISOString();

  try {
    // 1. owner_key의 모든 facts 조회 (processed된 것만)
    const { data: facts, error: factErr } = await db
      .schema('corehub').from('facts')
      .select('id')
      .eq('owner_key', ownerKey)
      .eq('processed', true);

    if (factErr) {
      console.warn('[corehub] facts 조회 실패:', factErr.message);
    }

    // 2. facts → connections (fact_ids 배열 겹침)
    //    connections 테이블에 owner_key 컬럼이 없으므로 facts를 매개로 조회
    const factIds = (facts || []).map(f => f.id);

    const { data: connections, error: connErr } = factIds.length > 0
      ? await db
          .schema('corehub').from('connections')
          .select('*')
          .overlaps('fact_ids', factIds)
          .order('strength', { ascending: false })
          .limit(5)
      : { data: [], error: null };

    if (connErr) console.warn('[corehub] connections 조회 실패:', connErr.message);

    // 3. facts → meanings (source_fact_ids 배열 겹침)
    const { data: meanings, error: meanErr } = factIds.length > 0
      ? await db
          .schema('corehub').from('meanings')
          .select('*')
          .overlaps('source_fact_ids', factIds)
          .gt('expires_at', now) // not expired (expires_at > now)
          .order('confidence', { ascending: false })
          .limit(5)
      : { data: [], error: null };

    if (meanErr) console.warn('[corehub] meanings 조회 실패:', meanErr.message);

    // 4. opportunities (target_owner_key 직접 매칭)
    const { data: oppData, error: oppErr } = await db
      .schema('corehub').from('opportunities')
      .select('*')
      .eq('target_owner_key', ownerKey)
      .gt('expires_at', now) // not expired
      .limit(10); // fetch extra for JS sorting

    if (oppErr) console.warn('[corehub] opportunities 조회 실패:', oppErr.message);

    // priority 순 정렬 (high > medium > low) — DB 텍스트 컬럼 정렬 불가
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const opportunities = (oppData || []).sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    ).slice(0, 5);

    return {
      opportunities: opportunities || [],
      meanings: meanings || [],
      connections: connections || [],
    };
  } catch (e) {
    console.warn('[corehub] fetchContext 예외:', e.message);
    return { opportunities: [], meanings: [], connections: [] };
  }
}
