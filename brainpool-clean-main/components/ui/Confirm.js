/**
 * MODULE-CN-19: Confirm 다이얼로그 (Confirm Dialog)
 * 소속: CoreNull / ui
 * 역할: 삭제 등 파괴적 액션 전 확인 팝업
 *
 * ─── 계약 (Master v1.0 §4) ───────────────────────────────────────
 * - 독립 모듈. 외부 의존성 없음.
 * - throw 금지.
 * ─────────────────────────────────────────────────────────────────
 *
 * 사용법:
 *   import { openConfirm, closeConfirm } from './ui/confirm.js';
 *
 *   openConfirm(
 *     '정말 삭제할까요?',
 *     '이 작업은 되돌릴 수 없습니다.',
 *     () => deleteItem(id)
 *   );
 */

'use strict';

// ── 내부 상태 ───────────────────────────────────────────────────────
let _onOk    = null;
let _overlay = null;

// ── DOM 초기화 ──────────────────────────────────────────────────────
function _ensureDOM() {
  if (_overlay) return;

  _overlay = document.getElementById('confirmOverlay');

  if (!_overlay) {
    _buildDOM();
    return;
  }

  // 기존 마크업에 이벤트 바인딩
  _bindEvents();
}

function _buildDOM() {
  _overlay = document.createElement('div');
  _overlay.id = 'confirmOverlay';
  _overlay.setAttribute('role', 'alertdialog');
  _overlay.setAttribute('aria-modal', 'true');
  _overlay.setAttribute('aria-labelledby', 'confirm-title');
  _overlay.setAttribute('aria-describedby', 'confirm-sub');
  _overlay.style.cssText = [
    'display:none',
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.5)',
    'z-index:10000',
    'align-items:center',
    'justify-content:center',
  ].join(';');

  _overlay.innerHTML = `
    <div style="
      background:var(--color-background-primary,#fff);
      border-radius:16px;
      padding:28px 24px 20px;
      width:min(320px,90vw);
      box-shadow:0 4px 24px rgba(0,0,0,0.18);
    ">
      <p id="confirm-title" style="
        font-size:17px;
        font-weight:500;
        color:var(--color-text-primary,#111);
        margin:0 0 8px;
        line-height:1.4;
      "></p>

      <p id="confirm-sub" style="
        font-size:14px;
        color:var(--color-text-secondary,#666);
        margin:0 0 24px;
        line-height:1.5;
      "></p>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="confirm-cancel" style="
          padding:10px 20px;
          border:0.5px solid var(--color-border-secondary,#ccc);
          border-radius:8px;
          background:none;
          font-size:14px;
          cursor:pointer;
          color:var(--color-text-primary,#111);
        ">취소</button>

        <button id="confirm-ok" style="
          padding:10px 20px;
          border:none;
          border-radius:8px;
          background:var(--color-background-danger,#e24b4a);
          color:#fff;
          font-size:14px;
          font-weight:500;
          cursor:pointer;
        ">확인</button>
      </div>
    </div>
  `;

  document.body.appendChild(_overlay);
  _bindEvents();
}

function _bindEvents() {
  _overlay.querySelector('#confirm-ok')?.addEventListener('click', _handleOk);
  _overlay.querySelector('#confirm-cancel')?.addEventListener('click', closeConfirm);

  // 오버레이 바깥 클릭 → 닫기
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay) closeConfirm();
  });

  // ESC 키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _overlay?.style.display !== 'none') closeConfirm();
  });
}

function _handleOk() {
  closeConfirm();
  if (typeof _onOk === 'function') {
    try { _onOk(); } catch (err) {
      console.warn('[Confirm] onOk 콜백 오류:', err);
    }
  }
}

// ── 공개 API ────────────────────────────────────────────────────────

/**
 * 확인 다이얼로그를 엽니다.
 *
 * @param {string}   title  다이얼로그 제목
 * @param {string}   sub    부제목 / 경고 문구
 * @param {Function} onOk   확인 버튼 클릭 시 실행할 콜백
 */
export function openConfirm(title, sub, onOk) {
  _ensureDOM();

  _onOk = onOk ?? null;

  const titleEl = _overlay.querySelector('#confirm-title');
  const subEl   = _overlay.querySelector('#confirm-sub');

  if (titleEl) titleEl.textContent = title || '';
  if (subEl)   subEl.textContent   = sub   || '';

  _overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // 포커스 트랩: 확인 버튼으로 포커스 이동
  _overlay.querySelector('#confirm-ok')?.focus();
}

/** 확인 다이얼로그를 닫습니다. */
export function closeConfirm() {
  if (!_overlay) return;
  _overlay.style.display = 'none';
  document.body.style.overflow = '';
  _onOk = null;
}