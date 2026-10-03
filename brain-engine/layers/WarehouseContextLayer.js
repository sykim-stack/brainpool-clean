// brain-engine/layers/WarehouseContextLayer.js
//
// HajunAI 컨텍스트로 CoreHub 결과를 가져오는 레이어.
// RingLexiconLayer 패턴: class with handle(ctx), ctx.payload.action 라우팅.
//
// CoreRing → CoreHub → HajunAI 컨텍스트 전달 고리를 완성한다.
//   1. CoreRing: 번역/채팅 → tb_trans_logs + CoreHub Fact POST
//   2. CoreHub: runPipeline → connections / meanings / opportunities
//   3. HajunAI: WarehouseContextLayer가 CoreHub 결과를 컨텍스트로 조회

import { fetchContext } from '../connectors/corehub.js';

export class WarehouseContextLayer {
  /**
   * ctx.payload = { action: 'getContext', owner_key: string }
   * owner_key는 brainpool/route.ts(device_id) 또는 chat/route.ts(userId)와 동일
   */
  async handle(ctx) {
    const action = ctx.payload?.action || ctx.action;
    switch (action) {
      case 'getContext':       return await this.getContext(ctx);
      case 'getOpportunities':  return await this.getOpportunities(ctx);
      case 'getMeanings':       return await this.getMeanings(ctx);
      case 'getConnections':    return await this.getConnections(ctx);
      default:
        return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } };
    }
  }

  /**
   * CoreHub 결과 전체 컨텍스트 조회 (opportunities + meanings + connections)
   * HajunAI 응답 생성 시 주로 호출.
   */
  async getContext(ctx) {
    const ownerKey = ctx.payload?.owner_key || ctx.owner_key;
    if (!ownerKey) {
      return { ...ctx, _error: { code: 'OWNER_KEY_MISSING', message: 'owner_key required' } };
    }

    const warehouse = await fetchContext(ownerKey);

    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        warehouse: {
          opportunities: warehouse.opportunities,
          meanings: warehouse.meanings,
          connections: warehouse.connections,
        },
      },
    };
  }

  /**
   * 우선순위별 opportunities만 조회.
   * HajunAI가 "무엇을 제안할지" 결정할 때 사용.
   */
  async getOpportunities(ctx) {
    const ownerKey = ctx.payload?.owner_key || ctx.owner_key;
    const { opportunities } = await fetchContext(ownerKey || '');

    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        opportunities,
      },
    };
  }

  /**
   * confidence 순으로 정렬된 meanings 조회.
   * HajunAI가 "관계 이해"에 사용.
   */
  async getMeanings(ctx) {
    const ownerKey = ctx.payload?.owner_key || ctx.owner_key;
    const { meanings } = await fetchContext(ownerKey || '');

    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        meanings,
      },
    };
  }

  /**
   * strength 순으로 정렬된 connections 조회.
   * HajunAI가 "패턴 인지"에 사용.
   */
  async getConnections(ctx) {
    const ownerKey = ctx.payload?.owner_key || ctx.owner_key;
    const { connections } = await fetchContext(ownerKey || '');

    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        connections,
      },
    };
  }
}
