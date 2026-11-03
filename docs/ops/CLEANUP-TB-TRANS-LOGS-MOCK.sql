-- =============================================================================
-- P0-5 follow-up: tb_trans_logs Mock 오염 행 정리
-- =============================================================================
-- Context
--   PR #29: saveCache skips mock / [Mock]; findCache ignores [Mock] hits.
--   Rows already inserted before that fix can still sit in the table.
--
-- How to run
--   1) Supabase Dashboard → SQL Editor (service role / project owner)
--   2) Run SECTION A (dry-run) first — review count and samples
--   3) Only then run SECTION B (delete)
--
-- Safety
--   - Prefer DELETE over TRUNCATE (scoped to mock patterns only)
--   - No automatic app migration — human-gated ops only
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION A — dry-run (read-only)
-- -----------------------------------------------------------------------------

-- A1. 건수
SELECT count(*) AS mock_row_count
FROM public.tb_trans_logs
WHERE standard_vi ILIKE '[Mock]%'
   OR standard_vi ILIKE '[[]Mock]%';  -- defensive; primary pattern is [Mock]

-- A2. 샘플 (최근 50)
SELECT id, direction, left(source_text, 80) AS source_preview,
       left(standard_vi, 80) AS vi_preview, created_at
FROM public.tb_trans_logs
WHERE standard_vi ILIKE '[Mock]%'
ORDER BY created_at DESC
LIMIT 50;

-- A3. (선택) 동일 source_text에 정상 행이 있는지 확인 — 삭제 후 재번역 유도 판단용
-- SELECT source_text, direction,
--        count(*) FILTER (WHERE standard_vi ILIKE '[Mock]%') AS mock_n,
--        count(*) FILTER (WHERE standard_vi NOT ILIKE '[Mock]%') AS real_n
-- FROM public.tb_trans_logs
-- GROUP BY 1, 2
-- HAVING count(*) FILTER (WHERE standard_vi ILIKE '[Mock]%') > 0
-- LIMIT 100;

-- -----------------------------------------------------------------------------
-- SECTION B — delete (run only after A looks correct)
-- -----------------------------------------------------------------------------
-- Uncomment to execute:

-- BEGIN;
-- DELETE FROM public.tb_trans_logs
-- WHERE standard_vi ILIKE '[Mock]%';
-- -- Optional: return how many rows were removed
-- -- GET DIAGNOSTICS is PL/pgSQL; in SQL editor check the UI row count.
-- COMMIT;

-- One-liner alternative (no transaction block in some editors):
-- DELETE FROM public.tb_trans_logs WHERE standard_vi ILIKE '[Mock]%';
