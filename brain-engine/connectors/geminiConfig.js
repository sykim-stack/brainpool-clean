// brain-engine/connectors/geminiConfig.js
// Single source of truth for CoreRing Gemini model + REST endpoint.
// Used by emotion, dialect, and (via relative import) lib/analysis provider.
//
// Rules:
//   - Do NOT pass thinkingConfig.thinkingBudget (Gemini 2.5-only; breaks 3.x)
//   - Change MODEL here only — never hardcode model strings in call sites

export const GEMINI_MODEL = 'gemini-3.8-flash';

export const GEMINI_GENERATE_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
