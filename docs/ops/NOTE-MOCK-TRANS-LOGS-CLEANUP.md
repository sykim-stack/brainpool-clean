# Note — tb_trans_logs Mock 정리 (P0-5 follow-up)

| Field | Value |
| --- | --- |
| **Status** | Ops runbook — **human-gated SQL only** |
| **Date** | 2026-11-03 |
| **Related** | PR #29 (`cache.js` save/find skip) |

## Already in code

| Path | Behavior |
| --- | --- |
| `brain-engine/engines/translation/cache.js` `saveCache` | `translationSource === 'mock'` or `standard_vi` starts with `[Mock]` → **no INSERT** |
| same `findCache` | existing row with `[Mock]` prefix → **cache miss** (re-translate) |
| `translate.js` | DeepL fail → still returns `[Mock] ` + text to UI, but **not cached** after #29 |
| `/api/translate` | DeepL fail → **500**, does not write mock text |

## Still needed (ops)

Rows inserted **before** #29 remain in `tb_trans_logs`. They no longer poison cache hits, but they:

- clutter analytics / admin queries
- may confuse manual DB inspection

Use `docs/ops/CLEANUP-TB-TRANS-LOGS-MOCK.sql`:

1. **SECTION A** dry-run (count + sample)
2. **SECTION B** DELETE after review

Do **not** auto-run from the app or CI.

## Out of scope

- Ownership / CoreHub (separate track)
- Merging `lib/analysis` + `emotion` Gemini providers (next backlog item if desired)
