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

  // 🔥 수정: options 파라미터 추가
  async process(text, traceId = crypto.randomUUID(), author = 'anonymous', options = {}) {
    let ctx = {
      payload: {
        text,
        author,
        ...options,      // 🔥 targetLang 등 모든 옵션을 payload에 합침
      },
      traceId,
    };
    ctx = await this.language.process(ctx);
    ctx = await this.translation.process(ctx);
    ctx = await this.meaning.process(ctx);
    ctx = await this.culture.process(ctx);
    ctx = await this.output.process(ctx);
    return ctx.payload.message;
  }
}