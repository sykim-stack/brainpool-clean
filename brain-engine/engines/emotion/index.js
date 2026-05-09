import { analyze } from './analyze.js';

// router.js에서 import * as EmotionEngine으로 가져올 수 있도록 모든 함수를 export
export { analyze };

// 또는 기본 객체를 export (router.js에서 EmotionEngine.analyze로 접근 가능)
export const EmotionEngine = { analyze };