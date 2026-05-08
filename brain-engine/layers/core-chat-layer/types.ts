// ============================================================
// 🧠 BRAINPOOL OS – CoreChatLayer Types
// ============================================================
// 위치: brain-engine/layers/core-chat-layer/types.ts
// 역할: CoreChatLayer의 모든 인터페이스와 타입 정의
// 규칙: traceId는 모든 메시지와 액션에 필수, 에러는 throw 금지 (_error 반환)
// ============================================================

// --------------------------------------------------
// 🔷 방(Room) 관련 타입
// --------------------------------------------------

/** 채팅방 상태 */
export type RoomStatus = 'active' | 'archived' | 'locked';

/** 채팅방 메타데이터 */
export interface ChatRoom {
  roomId: string;          // 고유 식별자 (예: room_1714600000000_abc123)
  title: string;           // 방 제목
  status: RoomStatus;      // 방 상태
  createdBy: string;       // 생성자 userId (기본값 'anonymous')
  createdAt: string;       // ISO 8601 타임스탬프
  updatedAt: string;       // 마지막 메시지 시간
  messageCount: number;    // 누적 메시지 수
  tags?: string[];         // 방 태그 (선택)
}

// --------------------------------------------------
// 🔷 메시지(Message) 관련 타입
// --------------------------------------------------

/** CoreRing 처리 결과를 포함한 완전한 메시지 */
export interface ChatMessage {
  messageId: string;               // 메시지 고유 ID
  roomId: string;                  // 소속 방 ID
  traceId: string;                 // CoreRing 처리 추적 ID
  userId: string;                  // 발신자 ID
  original: string;                // 원문 텍스트
  detectedLanguage?: string;       // 감지된 언어 코드 (예: 'ko', 'en')
  translations: {                  // 번역 결과 (DeepL/Gemini)
    en?: string;
    ko?: string;
    [langCode: string]: string | undefined;
  };
  emotion?: {                      // 감정 분석 결과
    primary: string;               // 주 감정 (예: 'joy', 'anger')
    intensity: number;             // 강도 (0~1)
    confidence: number;            // 신뢰도 (0~1)
  };
  cultureHints?: string[];         // 문화적 맥락 힌트 (예: ['반말 사용 감지'])
  contextNote?: string;            // 컨텍스트 필터 결과
  timestamp: string;               // 메시지 생성 시간 (ISO 8601)
  _error?: string;                 // 처리 중 에러 (있을 경우, throw 금지)
}

/** CoreRing에 전달할 원시 메시지 (처리 전) */
export interface RawMessage {
  userId: string;
  original: string;
  roomId: string;
  timestamp?: string;              // 없으면 서버에서 생성
}

// --------------------------------------------------
// 🔷 Action Envelope (BRAINPOOL 표준 통신 규격)
// --------------------------------------------------

/** CoreChatLayer가 처리할 수 있는 모든 액션 타입 */
export type CoreChatActionType =
  | 'CREATE_ROOM'
  | 'GET_ROOM'
  | 'LIST_ROOMS'
  | 'DELETE_ROOM'
  | 'SEND_MESSAGE'
  | 'GET_HISTORY'
  | 'GET_TRACE';

/** BRAINPOOL 표준 액션 봉투 */
export interface CoreChatAction {
  type: CoreChatActionType;
  payload: CreateRoomPayload | SendMessagePayload | GetHistoryPayload | GetTracePayload | string | null;
  traceId: string;                 // 모든 액션에 필수 (없으면 서버에서 생성)
}

/** CREATE_ROOM 페이로드 */
export interface CreateRoomPayload {
  title: string;
  createdBy?: string;              // 기본값 'anonymous'
  tags?: string[];
}

/** SEND_MESSAGE 페이로드 */
export interface SendMessagePayload {
  roomId: string;
  userId: string;
  original: string;
}

/** GET_HISTORY 페이로드 */
export interface GetHistoryPayload {
  roomId: string;
  limit?: number;                  // 기본값 50
  before?: string;                 // 이 시간 이전 메시지만 (커서 기반 페이징)
}

/** GET_TRACE 페이로드 */
export interface GetTracePayload {
  traceId: string;
}

// --------------------------------------------------
// 🔷 응답 타입
// --------------------------------------------------

/** CoreChatLayer의 모든 응답을 감싸는 표준 응답 */
export interface CoreChatResponse<T = any> {
  success: boolean;
  traceId: string;
  data?: T;
  error?: string;                  // _error 필드와 동일한 역할
  timestamp: string;
}

/** CREATE_ROOM 응답 데이터 */
export type CreateRoomResponse = CoreChatResponse<ChatRoom>;

/** GET_ROOM 응답 데이터 */
export type GetRoomResponse = CoreChatResponse<ChatRoom>;

/** LIST_ROOMS 응답 데이터 */
export type ListRoomsResponse = CoreChatResponse<ChatRoom[]>;

/** SEND_MESSAGE 응답 데이터 */
export type SendMessageResponse = CoreChatResponse<ChatMessage>;

/** GET_HISTORY 응답 데이터 */
export type GetHistoryResponse = CoreChatResponse<ChatMessage[]>;

/** GET_TRACE 응답 데이터 */
export type GetTraceResponse = CoreChatResponse<ChatMessage>;

// --------------------------------------------------
// 🔷 저장소 인터페이스 (추후 Supabase 등으로 교체 가능)
// --------------------------------------------------

/** Room 저장소 인터페이스 */
export interface IRoomStore {
  create(room: ChatRoom): ChatRoom;
  get(roomId: string): ChatRoom | null;
  list(): ChatRoom[];
  update(roomId: string, updates: Partial<ChatRoom>): ChatRoom | null;
  delete(roomId: string): boolean;
}

/** Message 저장소 인터페이스 */
export interface IMessageStore {
  add(message: ChatMessage): void;
  getByRoom(roomId: string, options?: { limit?: number; before?: string }): ChatMessage[];
  getByTrace(traceId: string): ChatMessage | null;
}