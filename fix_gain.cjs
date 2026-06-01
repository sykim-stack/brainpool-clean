const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "const stream = await navigator.mediaDevices.getUserMedia({ audio: true });",
  `const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      // 오디오 증폭
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 2.5; // 2.5배 증폭
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(dest);
      const amplifiedStream = dest.stream;`
);

content = content.replace(
  "const recorder = new MediaRecorder(stream, { mimeType });",
  "const recorder = new MediaRecorder(amplifiedStream, { mimeType });"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
