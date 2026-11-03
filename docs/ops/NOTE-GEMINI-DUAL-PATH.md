# Note — Gemini 이중 경로 (chat vs translate)

| Field | Value |
| --- | --- |
| **Status** | Inventory + shared config; **full provider merge deferred** |
| **Date** | 2026-11-03 |
| **Config** | `brain-engine/connectors/geminiConfig.js` |

## Two live paths

| Path | Entry | Implementation | Feeds |
| --- | --- | --- | --- |
| **A. Chat / brain-engine** | `route('emotion')` / `route('dialect')` | `engines/emotion/analyze.js`, `engines/dialect/detect.js` | WordModal **riskScore** (primary) |
| **B. /api/translate** | `app/api/translate/route.ts` | `lib/analysis/providers/gemini.ts` (`GeminiAnalysisProvider`) | `tb_trans_logs` analysis columns |

Both must use the **same** model string from `geminiConfig.js`.

## Why not full merge yet

- Path A is ctx/`payload` shape (brain-engine contract, no throw)
- Path B is typed `AnalysisProvider` → `toTransLogPayload`
- Merging requires an adapter layer and regression on WordModal risk + translate logs

**Now:** shared endpoint + no thinkingBudget (already fixed #32/#33/#34).  
**Later:** optional adapter so emotion calls `GeminiAnalysisProvider.analyze` once.

## Checklist when changing Gemini

1. Edit `GEMINI_MODEL` in `geminiConfig.js` only
2. Do not reintroduce `thinkingConfig.thinkingBudget` on 3.x
3. Smoke: chat message → WordModal risk bar; POST `/api/translate` → analysis fields
