import { runPipeline } from './pipeline.js';
import { detectLanguage } from '../modules/detectLanguage.js';
import { translate } from '../modules/translate.js';
import { contextFilter } from '../modules/contextFilter.js';
import { emotionFilter } from '../modules/emotionFilter.js';

export const coreRingEngine = (ctx) => runPipeline(ctx, [
  detectLanguage, translate, contextFilter, emotionFilter
]);