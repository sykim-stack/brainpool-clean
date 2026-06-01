const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

// audioCtx ref 추가
content = content.replace(
  "  const streamRef = useRef<MediaStream | null>(null);",
  "  const streamRef = useRef<MediaStream | null>(null);\n  const audioCtxRef = useRef<AudioContext | null>(null);"
);

// AudioContext 저장
content = content.replace(
  "      const audioCtx = new AudioContext();",
  "      if (audioCtxRef.current) { audioCtxRef.current.close(); }\n      const audioCtx = new AudioContext();\n      audioCtxRef.current = audioCtx;"
);

// onstop에서 AudioContext 정리
content = content.replace(
  "          mediaRecorder.current = null;\n          audioChunks.current = [];",
  "          mediaRecorder.current = null;\n          audioChunks.current = [];\n          if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
