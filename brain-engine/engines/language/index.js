import { detect } from './detect.js';

// router.js에서 import { detect }로 가져올 수 있도록 export
export { detect };

// 또는 기본 객체를 export
export const LanguageEngine = { detect };