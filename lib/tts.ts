// lib/tts.ts
// v2: iOS WebKit는 speechSynthesis.speak()가 사용자 제스처(클릭) 핸들러
// 안에서 "동기적으로" 호출되지 않으면(중간에 await가 끼면) 에러 없이
// 조용히 무시한다. 클릭 핸들러에서는 반드시 speakNow()를 사용할 것.
//
// 음성팩이 없는 언어로 speak()를 강행하면 브라우저가 임의의 다른 언어
// 음성으로 대체 재생하는 문제(v1에서 다루던 문제)는 getVoices() 동기
// 체크로 계속 방지한다.
//
// v3: utterance.lang만 주면 일부 기기(한국어 기본)가 베트남어 문장을
// 한국어 음성으로 읽어 억양이 틀린다. lang에 맞는 voice를 명시 지정.
//
// v4 (2026-11-10): 녹음 파일 재생용 playAudioUrl — iOS playsinline 단일
// HTMLAudioElement 재사용. MediaRecorder mime은 iOS에서 webm 미지원이
// 많으므로 mp4/aac를 우선 고른다.

let cachedVoices: SpeechSynthesisVoice[] = [];
let sharedAudio: HTMLAudioElement | null = null;

function refreshVoicesCache() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) cachedVoices = voices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoicesCache();
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoicesCache);
}

function hasVoiceForLangSync(lang: string): boolean {
  refreshVoicesCache();
  const prefix = lang.split('-')[0].toLowerCase();
  return cachedVoices.some((v) => v.lang.toLowerCase().startsWith(prefix));
}

function pickVoiceForLang(lang: string): SpeechSynthesisVoice | null {
  refreshVoicesCache();
  const prefix = lang.split('-')[0].toLowerCase();
  const exact = lang.toLowerCase();
  const byExact = cachedVoices.find((v) => v.lang.toLowerCase() === exact);
  if (byExact) return byExact;
  const byPrefix = cachedVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (byPrefix.length === 0) return null;
  return byPrefix.find((v) => v.default) || byPrefix[0];
}

/**
 * 클릭 핸들러 안에서 await 없이 곧바로 호출해야 합니다.
 * (iOS WebKit 사용자 제스처 요구 — 중간에 await가 끼면 조용히 무시됨)
 * lang에 맞는 voice를 지정해 시스템 기본 음성이 다른 언어를 읽는 것을 막습니다.
 * 음성팩이 없으면 재생하지 않고 false를 반환합니다.
 */
export function speakNow(text: string, lang: string, rate = 0.9): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return false;
  if (!hasVoiceForLangSync(lang)) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice = pickVoiceForLang(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * 녹음/스토리지 URL 재생. 클릭 핸들러에서 호출.
 * iOS: playsinline + 단일 Audio 재사용 (DOM append 불필요).
 * 실패 시 false — 호출측에서 TTS 폴백 가능.
 */
export function playAudioUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined' || !url) return Promise.resolve(false);

  try {
    if (!sharedAudio) {
      sharedAudio = new Audio();
      sharedAudio.setAttribute('playsinline', 'true');
      sharedAudio.setAttribute('webkit-playsinline', 'true');
      sharedAudio.preload = 'auto';
    }

    // TTS와 겹치면 끊기
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    sharedAudio.pause();
    try {
      sharedAudio.currentTime = 0;
    } catch {
      /* ignore seek errors on fresh src */
    }
    sharedAudio.src = url;

    const playResult = sharedAudio.play();
    if (playResult && typeof playResult.then === 'function') {
      return playResult.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * MediaRecorder MIME — iOS Safari는 webm 미지원인 경우가 많아 mp4/aac 우선.
 * 지원 목록이 비면 undefined (브라우저 기본).
 */
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
  ];
  for (const type of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export function recorderFileExt(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('aac') || mimeType.includes('m4a')) {
    return 'm4a';
  }
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

// ── 아래는 v1 호환용 (비동기 버전). 클릭 핸들러에는 사용하지 말 것 —
//    await로 인해 iOS에서 조용히 실패함. 사전 워밍업 등 용도로만 유지. ──
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);
  if (cachedVoices.length > 0) return Promise.resolve(cachedVoices);
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const handler = () => {
      refreshVoicesCache();
      if (cachedVoices.length > 0) {
        synth.removeEventListener('voiceschanged', handler);
        resolve(cachedVoices);
      }
    };
    synth.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', handler);
      refreshVoicesCache();
      resolve(cachedVoices);
    }, 1000);
  });

  return voicesPromise;
}

export async function hasVoiceForLang(lang: string): Promise<boolean> {
  const voices = await loadVoices();
  const prefix = lang.split('-')[0].toLowerCase();
  return voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
}

/** @deprecated 클릭 핸들러에는 speakNow()를 사용하세요 (iOS 사용자 제스처 문제) */
export async function speakIfVoiceAvailable(text: string, lang: string, rate = 0.9): Promise<boolean> {
  await loadVoices();
  return speakNow(text, lang, rate);
}
