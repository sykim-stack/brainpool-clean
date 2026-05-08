/**
 * BUG-01 FIX: 방 생성 후 채팅 화면 전환 간헐 지연
 * ─────────────────────────────────────────────────────────────────
 * 원인 분석:
 *   1. createNewRoom() 이 POST 완료 전에 switchToChatMode() 를 호출
 *      → window.currentRoom 이 null 인 상태에서 폴링 시작
 *      → 첫 폴링이 빈 결과를 반환하면 UI 가 RING 모드로 되돌아감
 *
 *   2. startPolling() 내 setInterval 이 중복 등록될 수 있음
 *      → 이전 방을 나가도 이전 pollingTimer 가 clearInterval 되지 않음
 *      → 두 개의 타이머가 동시에 돌며 UI 깜빡임 발생
 *
 *   3. doJoin() / createNewRoom() 에서 에러 시 _error 를 throw 해
 *      switchToChatMode() 가 호출되지 않는데 UI 상태는 CHAT 으로 남음
 *
 * 수정 내용:
 *   - createNewRoom / doJoin: await 완료 후에만 switchToChatMode 호출
 *   - startPolling: 기존 타이머 반드시 stopPolling() 후 재시작
 *   - exitChatMode: stopPolling() 먼저, 그 다음 switchToRingMode
 *   - 에러 발생 시 UI 상태 RING 으로 복원
 *
 * 소속 모듈: MODULE-CR-09 (Room Manager)
 * 파일 위치: rooms.js
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

// ── 외부 의존성 (engine.js 에서 주입) ─────────────────────────────
let _switchToChatMode = null;
let _switchToRingMode = null;

/** engine.js 초기화 시 호출 */
export function initRooms({ switchToChatMode, switchToRingMode }) {
  _switchToChatMode = switchToChatMode;
  _switchToRingMode = switchToRingMode;
}

// ── 내부 상태 ───────────────────────────────────────────────────────
let _pollingTimer   = null;
let _pollingRoomId  = null;
const POLL_INTERVAL = 3000; // ms

// ── 공개 상태 ───────────────────────────────────────────────────────
/** 현재 연결된 방. null = 연결 없음 */
export let currentRoom = null;

// ── 방 생성 ─────────────────────────────────────────────────────────

/**
 * BUG-01-A 수정:
 *   createNewRoom() 이 완전히 완료(await)된 후에만 switchToChatMode 호출.
 *   에러 발생 시 RING 모드 복원.
 */
export async function createNewRoom(device_id, nickname = '익명') {
  _setUILoading(true);

  let data;
  try {
    const res = await fetch('/api/corechat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:  'create-room',
        payload: { device_id, nickname },
      }),
    });
    const json = await res.json();

    if (json._error) throw new Error(json._error.message);
    data = json.payload.room;

  } catch (err) {
    console.warn('[RoomManager] createNewRoom 실패:', err.message);
    _showToast('방 생성 중 오류가 발생했습니다.');
    _setUILoading(false);
    // ✅ 에러 시 RING 모드 복원 (BUG-01-C)
    _switchToRingMode?.();
    return;
  }

  // ✅ DB 저장 완료 후에만 상태 설정 및 UI 전환 (BUG-01-A)
  currentRoom = data;
  _setUILoading(false);
  _switchToChatMode?.(data);
  startPolling(data.id);
}

// ── 방 입장 ─────────────────────────────────────────────────────────

/**
 * BUG-01-A 수정: doJoin 도 동일 패턴 적용
 */
export async function doJoin(invite_code, device_id, nickname = '익명') {
  if (!/^[A-Z]{6}$/.test(invite_code?.trim() ?? '')) {
    _showToast('초대 코드는 6자 영문 대문자입니다.');
    return;
  }

  _setUILoading(true);

  let data;
  try {
    const res = await fetch('/api/corechat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:  'join-room',
        payload: { invite_code: invite_code.trim(), device_id, nickname },
      }),
    });
    const json = await res.json();

    if (json._error) throw new Error(json._error.message);
    data = json.payload.room;

  } catch (err) {
    console.warn('[RoomManager] doJoin 실패:', err.message);
    _showToast('방 입장 중 오류가 발생했습니다.');
    _setUILoading(false);
    _switchToRingMode?.();
    return;
  }

  currentRoom = data;
  _setUILoading(false);
  _switchToChatMode?.(data);
  startPolling(data.id);
}

// ── 방 나가기 ───────────────────────────────────────────────────────

/**
 * BUG-01-C 수정:
 *   stopPolling() 먼저, 그 다음 currentRoom 초기화, 마지막 UI 전환.
 *   순서 역전이 없도록 고정.
 */
export function exitChatMode() {
  stopPolling();           // ① 타이머 해제 (가장 먼저)
  currentRoom = null;      // ② 상태 초기화
  _switchToRingMode?.();   // ③ UI 전환
}

// ── 폴링 ────────────────────────────────────────────────────────────

/**
 * BUG-01-B 수정:
 *   startPolling() 호출 시 기존 타이머를 반드시 중단 후 새로 등록.
 *   동일 roomId 에 대한 중복 등록도 방지.
 */
export function startPolling(roomId) {
  if (_pollingTimer && _pollingRoomId === roomId) return; // 중복 방지

  stopPolling(); // 기존 타이머 무조건 해제

  _pollingRoomId = roomId;
  _pollingTimer  = setInterval(() => _poll(roomId), POLL_INTERVAL);

  // 즉시 1회 실행 (첫 메시지 로딩 지연 제거)
  _poll(roomId);
}

export function stopPolling() {
  if (_pollingTimer) {
    clearInterval(_pollingTimer);
    _pollingTimer  = null;
    _pollingRoomId = null;
  }
}

// ── 내부: 메시지 폴링 ───────────────────────────────────────────────
let _lastCursor = null;

async function _poll(roomId) {
  // 방이 바뀌었으면 이 폴링 사이클 무시
  if (!currentRoom || currentRoom.id !== roomId) return;

  try {
    const res = await fetch('/api/corechat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:  'get-messages',
        payload: { room_id: roomId, cursor: _lastCursor, limit: 50 },
      }),
    });
    const json = await res.json();
    if (json._error) return;

    const messages = json.payload.messages ?? [];
    if (!messages.length) return;

    // 커서 갱신
    _lastCursor = messages.at(-1).created_at;

    // 채팅 히스토리 UI 업데이트
    messages.forEach(appendChatToHistory);

  } catch (err) {
    console.warn('[RoomManager] 폴링 오류:', err.message);
  }
}

// ── 채팅 히스토리 추가 (MODULE-CR-08 연동) ─────────────────────────
export function appendChatToHistory(msg) {
  const container = document.getElementById('chat-history');
  if (!container) return;

  const div  = document.createElement('div');
  const isMine = msg.device_id === _getDeviceId();

  div.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;
  div.innerHTML = `
    <p class="chat-content">${_escapeHtml(msg.content)}</p>
    ${msg.meta?.translated_ko
      ? `<p class="chat-translated ko">${_escapeHtml(msg.meta.translated_ko)}</p>`
      : ''}
    ${msg.meta?.translated_vi
      ? `<p class="chat-translated vi">${_escapeHtml(msg.meta.translated_vi)}</p>`
      : ''}
    <span class="chat-time">${_formatTime(msg.created_at)}</span>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── 유틸 ────────────────────────────────────────────────────────────
function _setUILoading(on) {
  const btn = document.getElementById('create-room-btn');
  if (btn) btn.disabled = on;
}
function _showToast(msg) {
  // 프로젝트 공통 toast 사용 (common.js 의 showToast)
  window.showToast?.(msg);
}
function _getDeviceId() {
  return localStorage.getItem('bp_device_id') ?? '';
}
function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}