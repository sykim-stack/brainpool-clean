-- CoreRing Analysis Layer Migration
-- 날짜: 2026-06-30
-- 목적: 분석 파이프라인 신규 컬럼 추가

-- 1. meaning_score 컬럼 추가
--    의미 전달률 0.0 ~ 1.0
--    기존 데이터: NULL (분석 전 상태)
ALTER TABLE public.tb_trans_logs
  ADD COLUMN IF NOT EXISTS meaning_score DOUBLE PRECISION DEFAULT NULL;

-- 2. is_southern 컬럼 추가
--    남부 방언 여부 (기존 is_southern 없는 경우 대비)
ALTER TABLE public.tb_trans_logs
  ADD COLUMN IF NOT EXISTS is_southern BOOLEAN DEFAULT FALSE;

-- 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tb_trans_logs'
  AND column_name IN ('meaning_score', 'is_southern', 'risk_score', 'detected_dialect', 'final_dialect', 'intent', 'cultural_notes')
ORDER BY column_name;
