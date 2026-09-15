export type MessageType = 'post' | 'comment' | 'chat' | 'event';

export interface MessageMeta {
  emotion?: string;
  emotion_score?: number;
  media_urls?: string[];
  room_id?: string;
  translated_ko?: string;
  translated_vi?: string;
  source_lang?: string;
  author_name?: string;
  photo_url?: string;
  ai_translated?: string;
  event_date?: string;
  category_id?: string;
  story_id?: string;
}

export interface MessageRelations {
  parent_id?: string;
  category_ids?: string[];
  reaction_ids?: string[];
}

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  meta: MessageMeta;
  relations: MessageRelations;
  created_at: string;
  device_id?: string | null;
  house_id?: string | null;
}

export const MESSAGE_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
  CHAT: 'chat',
  EVENT: 'event',
} as const;

export function createMessage(fields: Partial<Message>): Message | null {
  const { type, content } = fields;
  if (!type || !Object.values(MESSAGE_TYPE).includes(type as any)) return null;
  if (typeof content !== 'string') return null;

  return {
    id: fields.id ?? crypto.randomUUID(),
    type: type as MessageType,
    content,
    meta: fields.meta ?? {},
    relations: fields.relations ?? {},
    created_at: fields.created_at ?? new Date().toISOString(),
    device_id: fields.device_id ?? null,
    house_id: fields.house_id ?? null,
  };
}

export function isMessage(v: unknown): v is Message {
  return (
    !!v && typeof v === 'object' &&
    typeof (v as any).id === 'string' &&
    Object.values(MESSAGE_TYPE).includes((v as any).type) &&
    typeof (v as any).content === 'string'
  );
}