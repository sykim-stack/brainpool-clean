# 최소 기능 검증 기록

- 기준 커밋: be8b71a 원본 상태
- 운영 주소: https://corering.vercel.app
- 베트남어 입력 `Hôm nay ăn gì nhỉ` 후 번역 결과 `오늘은 뭘 먹을까`가 표시됨.
- 번역 결과는 단어별 span으로 분리되어 클릭 대상이 존재함.
- 첫 단어 클릭 시 WordModal은 열리지만 제목과 sentence가 원문 전체 `Hôm nay ăn gì nhỉ`로 표시됨.
- 원본 page.tsx의 handleWordClick은 클릭 단어를 API로 조회하지만 WordModal data.sentence에는 selectedMessage.original만 전달함.
- 따라서 최소 수정은 선택 단어 상태를 별도로 보존하고 WordModal sentence에 선택 단어를 전달하는 것임.
- 원본 ChatBubble의 speaker는 기존 Browser speechSynthesis fallback을 사용함. 이번 최소 수정에서는 해당 음성 경로를 건드리지 않음.
