import { route } from './hajun/router.js';
import { createCtx } from './contracts/ctx.js';

const ctx = createCtx({ action: 'getInterests' });
const result = await route(ctx);
console.log(JSON.stringify(result, null, 2));
