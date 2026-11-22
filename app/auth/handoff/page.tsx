'use client';

import { useEffect, useRef, useState } from 'react';

const AUTH_USER_KEY = 'corering_auth_user_id';

export default function CoreRingHandoffPage() {
  const started = useRef(false);
  const [message, setMessage] = useState('인증을 확인하고 있어요…');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const ticket =
      new URLSearchParams(window.location.hash.slice(1)).get('ticket') || '';
    window.history.replaceState(null, '', window.location.pathname);

    if (!ticket) {
      setMessage(
        '인증 전달 정보가 없거나 이미 만료되었습니다. 이전 Core에서 다시 시작해 주세요.',
      );
      return;
    }

    fetch('/api/auth/core-session', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok || typeof result?.data?.auth_user_id !== 'string') {
          throw new Error(
            '인증 전달에 실패했거나 ticket이 만료·사용되었습니다. 이전 Core에서 다시 시작해 주세요.',
          );
        }

        try {
          sessionStorage.setItem(AUTH_USER_KEY, result.data.auth_user_id);
        } catch {
          // ignore storage failures
        }

        setMessage('인증 연결을 확인했습니다. CoreRing으로 이동합니다…');
        window.location.replace('/');
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : '인증 전달에 실패했습니다.',
        );
      });
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0D1117',
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 440,
          borderRadius: 18,
          background: '#161B22',
          border: '1px solid #30363D',
          padding: 28,
          color: '#E6EDF3',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 20 }}>CoreRing 인증 연결</h1>
        <p role="status" style={{ lineHeight: 1.6, color: '#8B949E' }}>
          {message}
        </p>
      </section>
    </main>
  );
}
