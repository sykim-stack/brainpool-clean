-- =============================================================================
-- cleanup-mock-trans-logs.sql
-- Purpose: Remove legacy [Mock] rows from tb_trans_logs (P0-5 follow-up)
-- Runtime already: saveCache skips mock; findCache ignores [Mock] hits.
-- This script only cleans rows already written before that guard.
--
-- Run in Supabase SQL Editor (service role / dashboard). Review SELECT first.
-- =============================================================================

-- 1) Preview: how many / sample
SELECT
  id,
  direction,
  left(source_text, 80) AS source_preview,
  left(standard_vi, 80) AS standard_preview,
  created_at
FROM public.tb_trans_logs
WHERE standard_vi ILIKE '[Mock]%'
ORDER BY created_at DESC
LIMIT 50;

SELECT count(*) AS mock_row_count
FROM public.tb_trans_logs
WHERE standard_vi ILIKE '[Mock]%';

-- 2) Delete (uncomment after reviewing counts)
-- DELETE FROM public.tb_trans_logs
-- WHERE standard_vi ILIKE '[Mock]%';

-- 3) Optional: also clear rows that are pure echo of source with Mock prefix variants
-- DELETE FROM public.tb_trans_logs
-- WHERE standard_vi ~* '^\[\s*mock\s*\]';
