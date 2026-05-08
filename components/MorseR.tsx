'use client';

export default function MorseR({ isTyping = false }: { isTyping?: boolean }) {
  return (
    <div className={`morse-r ${isTyping ? 'typing' : ''}`}>
      <div className="m-dot" />
      <div className="m-dash" />
      <div className="m-dot" />
    </div>
  );
}