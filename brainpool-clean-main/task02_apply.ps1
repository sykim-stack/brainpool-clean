# ============================================================
# TASK-02: /api/chat 단일 라우트 전환 스크립트
# 실행 위치: C:\brainpool-clean\brainpool-clean
# ============================================================

$ROOT = "C:\brainpool-clean\brainpool-clean"
Set-Location $ROOT

Write-Host "🔴 TASK-02 시작: /api/chat 단일화" -ForegroundColor Cyan

# ── STEP 1: 새 파일 배치 ──────────────────────────────────────────────
# 아래 두 파일을 Claude가 제공한 코드로 교체

# 1-A. app/api/chat/route.ts 생성 (새 단일 라우트)
$chatDir = "$ROOT\app\api\chat"
# ⚠️  route.ts 파일은 Claude가 제공한 코드를 직접 붙여넣기
# New-Item -ItemType File -Path "$chatDir\route.ts" -Force
Write-Host "  ✏️  app/api/chat/route.ts → Claude 제공 코드로 생성" -ForegroundColor Yellow

# 1-B. app/page.tsx 교체
Write-Host "  ✏️  app/page.tsx → Claude 제공 코드로 교체" -ForegroundColor Yellow

# ── STEP 2: 구 라우트 파일 삭제 ──────────────────────────────────────
Write-Host ""
Write-Host "🗑️  구 라우트 삭제 중..." -ForegroundColor Red

$toDelete = @(
    "$ROOT\app\api\chat\send\route.ts",
    "$ROOT\app\api\chat\poll\route.ts",
    "$ROOT\app\api\chat\join\route.ts"
)

foreach ($file in $toDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  삭제: $file" -ForegroundColor Gray
    } else {
        Write-Host "  없음(스킵): $file" -ForegroundColor DarkGray
    }
}

# 빈 폴더 정리
$dirsToCheck = @(
    "$ROOT\app\api\chat\send",
    "$ROOT\app\api\chat\poll",
    "$ROOT\app\api\chat\join"
)

foreach ($dir in $dirsToCheck) {
    if (Test-Path $dir) {
        $items = Get-ChildItem $dir
        if ($items.Count -eq 0) {
            Remove-Item $dir -Force
            Write-Host "  빈폴더 삭제: $dir" -ForegroundColor Gray
        }
    }
}

# ── STEP 3: 라우트 수 확인 ────────────────────────────────────────────
Write-Host ""
Write-Host "📊 현재 API 라우트 수 확인:" -ForegroundColor Cyan
$routeFiles = Get-ChildItem -Path "$ROOT\app\api" -Recurse -Filter "route.ts"
Write-Host "  총 $($routeFiles.Count)개:" -ForegroundColor White
foreach ($f in $routeFiles) {
    $rel = $f.FullName.Replace("$ROOT\app\api\", "")
    Write-Host "  - /api/$rel" -ForegroundColor DarkCyan
}

if ($routeFiles.Count -le 9) {
    Write-Host ""
    Write-Host "✅ TASK-02 완료: 라우트 $($routeFiles.Count)개 (9개 이하)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  라우트 $($routeFiles.Count)개 — 추가 통합 필요" -ForegroundColor Yellow
}

# ── STEP 4: git push ──────────────────────────────────────────────────
Write-Host ""
Write-Host "📤 Git push..." -ForegroundColor Cyan
git add -A
git commit -m "TASK-02: /api/chat 단일 라우트 전환 (action 분기)"
git push

Write-Host ""
Write-Host "🚀 완료. Vercel 자동 배포 대기 중..." -ForegroundColor Green
