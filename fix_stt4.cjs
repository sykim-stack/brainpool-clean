const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const old = `  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    // STT 결과로 텍스트 전송
    const transcript = transcriptRef.current;
    if (transcript) {
      console.log('[Voice] STT 결과:', transcript);
      onSend(transcript);
    }
    try { recognitionRef.current?.stop(); } catch(e) {}
    // 녹음 종료 (onstop에서 업로드)
    if (mediaRecorder.current?.state === 'recording')`;

const newCode = `  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    // STT 중지 (결과는 onstop에서 처리)
    try { recognitionRef.current?.stop(); } catch(e) {}
    // 잠깐 대기 후 녹음 종료 (STT 마지막 결과 수집 대기)
    setTimeout(() => {
      if (mediaRecorder.current?.state === 'recording')`;

content = content.replace(old, newCode);

// 닫는 괄호 추가
content = content.replace(
  `      if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.requestData();
      setTimeout(() => mediaRecorder.current?.stop(), 100);
    }
  };`,
  `      if (mediaRecorder.current?.state === 'recording') {
        mediaRecorder.current.requestData();
        setTimeout(() => mediaRecorder.current?.stop(), 100);
      }
    }, 500);
  };`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
