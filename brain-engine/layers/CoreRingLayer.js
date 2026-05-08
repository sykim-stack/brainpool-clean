// brain-engine/layers/CoreRingLayer.js
import { LanguageLayer } from './sub/LanguageLayer.js';
import { TranslationLayer } from './sub/TranslationLayer.js';
import { MeaningLayer } from './sub/MeaningLayer.js';
import { CultureLayer } from './sub/CultureLayer.js';
import { OutputLayer } from './sub/OutputLayer.js';

export class CoreRingLayer {
  constructor() {
    this.language = new LanguageLayer();
    this.translation = new TranslationLayer();
    this.meaning = new MeaningLayer();
    this.culture = new CultureLayer();
    this.output = new OutputLayer();
  }

  // 모든 함수는 (ctx) => ctx 형태를 지향하지만, 외부 호출용 process는 결과값 반환
  async process(text, traceId = crypto.randomUUID(), author = 'anonymous', options = {}) {
    let ctx = {
      payload: {
        text,
        author,
        ...options,
      },
      traceId,
      _error: null,
    };

    try {
      ctx = await this.language.process(ctx);
      if (ctx._error) return { _error: ctx._error, traceId };

      ctx = await this.translation.process(ctx);
      if (ctx._error) return { _error: ctx._error, traceId };

      ctx = await this.meaning.process(ctx);
      if (ctx._error) return { _error: ctx._error, traceId };

      ctx = await this.culture.process(ctx);
      if (ctx._error) return { _error: ctx._error, traceId };

      ctx = await this.output.process(ctx);
      if (ctx._error) return { _error: ctx._error, traceId };

      return ctx.payload.message || ctx.payload;
    } catch (err) {
      return { _error: err instanceof Error ? err.message : String(err), traceId };
    }
  }
}