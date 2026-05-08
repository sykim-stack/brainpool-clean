/**
 * MODULE-CN-03: 탭 네비게이션 (Tab Navigation)
 * 소속: CoreNull / ui
 * 역할: 거실/방/서재 탭 전환 및 활성 탭 상태 관리
 *
 * ─── 계약 (Master v1.0 §4) ───────────────────────────────────────
 * - UI 렌더링 + 라우팅만 담당. 데이터 fetching 없음.
 * - state.rooms 는 읽기 전용으로만 참조.
 * - throw 금지.
 * ─────────────────────────────────────────────────────────────────
 *
 * 의존성:
 *   - state (common.js)  → state.rooms
 *   - renderLobby        (tabs/living.js)
 *   - renderRoom         (tabs/room.js)
 *   - renderLibrary      (tabs/library.js)
 *
 * 사용법:
 *   import { buildTabs, switchTab, switchToRoomType } from './ui/tabs.js';
 *   buildTabs(state.rooms, { renderLobby, renderRoom, renderLibrary });
 */

'use strict';

// ── 내부 상태 ───────────────────────────────────────────────────────
let _renderers = {};   // { renderLobby, renderRoom, renderLibrary }
let _activeTab = null;

// ── DOM 셀렉터 헬퍼 ────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── 탭 ID 규칙 ─────────────────────────────────────────────────────
const TAB_LOBBY   = 'tab-lobby';
const TAB_LIBRARY = 'tab-library';
const roomTabId   = (roomId) => `tab-room-${roomId}`;

// ── 빌드 ───────────────────────────────────────────────────────────

/**
 * 탭 버튼 목록을 빌드하고 첫 탭(거실)을 활성화합니다.
 *
 * @param {Array}  rooms      state.rooms 배열
 * @param {Object} renderers  { renderLobby, renderRoom, renderLibrary }
 */
export function buildTabs(rooms = [], renderers = {}) {
  _renderers = renderers;

  const nav = $('#tab-nav');
  if (!nav) {
    console.warn('[Tabs] #tab-nav 요소를 찾을 수 없습니다.');
    return;
  }

  nav.innerHTML = '';

  // 거실 탭
  nav.appendChild(_makeBtn('거실', TAB_LOBBY));

  // 방 탭 (room_type 기반)
  (rooms || []).forEach((room) => {
    const label = room.room_name || room.room_type || '방';
    nav.appendChild(_makeBtn(label, roomTabId(room.id), room));
  });

  // 서재 탭
  nav.appendChild(_makeBtn('서재', TAB_LIBRARY));

  // 첫 탭 활성화
  switchTab(TAB_LOBBY);
}

/**
 * 지정 tabId 탭으로 전환합니다.
 * @param {string} tabId
 */
export function switchTab(tabId) {
  // 버튼 활성화
  $$('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // 콘텐츠 활성화
  $$('.tab-content').forEach((el) => {
    el.classList.toggle('active', el.id === tabId);
  });

  _activeTab = tabId;
  _renderTab(tabId);
}

/**
 * room_type 으로 탭을 찾아 전환합니다.
 * (예: switchToRoomType('bedroom') )
 * @param {string} type
 */
export function switchToRoomType(type) {
  const btn = $$(`.tab-btn[data-room-type="${type}"]`)[0];
  if (btn) switchTab(btn.dataset.tab);
  else console.warn(`[Tabs] room_type="${type}" 에 해당하는 탭이 없습니다.`);
}

/** 현재 활성 탭 ID를 반환합니다. */
export function getActiveTab() {
  return _activeTab;
}

// ── 내부 헬퍼 ──────────────────────────────────────────────────────

function _makeBtn(label, tabId, room = null) {
  const btn = document.createElement('button');
  btn.className   = 'tab-btn';
  btn.textContent = label;
  btn.dataset.tab = tabId;

  if (room) {
    btn.dataset.roomType = room.room_type || '';
    btn.dataset.roomId   = room.id || '';
  }

  btn.addEventListener('click', () => switchTab(tabId));

  // 대응하는 콘텐츠 패널이 없으면 생성
  _ensurePanel(tabId);

  return btn;
}

function _ensurePanel(tabId) {
  if ($(`.tab-content#${tabId}`)) return;

  const panel = document.createElement('div');
  panel.id        = tabId;
  panel.className = 'tab-content';

  const wrap = $('#tab-contents') || document.body;
  wrap.appendChild(panel);
}

async function _renderTab(tabId) {
  const container = $(`.tab-content#${tabId}`);
  if (!container) return;

  try {
    if (tabId === TAB_LOBBY && _renderers.renderLobby) {
      await _renderers.renderLobby(container);

    } else if (tabId === TAB_LIBRARY && _renderers.renderLibrary) {
      await _renderers.renderLibrary(container);

    } else if (tabId.startsWith('tab-room-') && _renderers.renderRoom) {
      const roomId = tabId.replace('tab-room-', '');
      const btn    = $(`.tab-btn[data-tab="${tabId}"]`);
      const room   = btn ? { id: roomId, room_type: btn.dataset.roomType } : { id: roomId };
      await _renderers.renderRoom(container, room);
    }
  } catch (err) {
    // throw 금지 — 렌더 오류는 UI에 표시
    console.warn('[Tabs] 렌더링 오류:', err);
    container.innerHTML = `<p style="color:var(--color-text-danger,red);padding:1rem">
      탭을 불러오는 중 문제가 발생했습니다.</p>`;
  }
}