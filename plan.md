# CoreRing KIIP 단계형 연습 MVP 계획

## 목표

CoreRing의 실생활 번역과 단어 클릭 학습을 KIIP 단계형 연습으로 연결한다. 공식 KIIP 과정을 대체하지 않고, 실제 대화 문맥에서 어휘·표현을 복습하고 다음 학습 행동으로 이어지는 보강 레이어로 제공한다.

## MVP 범위

- 초기 범위는 **KIIP 1단계**만 지원한다.
- 초기 학습 언어는 현재 서비스의 한국어·베트남어 흐름을 유지한다.
- 학습 세션은 한 번에 5문제로 제한한다.
- 문제 유형은 다음 3가지로 시작한다.
  1. **뜻 고르기**: 한국어 표현을 보고 베트남어 뜻 선택
  2. **문맥 빈칸**: 실생활 대화 문장의 빈칸에 알맞은 표현 선택
  3. **순서/응답 고르기**: 상황에 맞는 자연스러운 응답 선택
- 각 문제는 정답·해설·짧은 예문을 제공한다.
- 채팅에서 클릭해 저장한 단어가 KIIP 1단계 항목과 연결되면 “연습에 추가”할 수 있다.
- 결과 화면에는 정답 수, 취약 주제, 다시 연습 버튼을 제공한다.
- 공식 시험 합격률, 인증, 공식 교재 대체를 암시하지 않는다.

## 사용자 흐름

1. CorePhrase 또는 새 KIIP 탭에서 단계와 오늘의 연습을 확인한다.
2. “5문제 시작”을 누른다.
3. 한 화면에 문제 하나만 표시한다.
4. 선택 즉시 정답 여부와 해설을 보여준다.
5. 다음 문제로 이동한다.
6. 완료 후 점수와 취약 영역을 보여준다.
7. 오답 표현은 CorePhrase 단어장과 연결하고 다시 연습할 수 있게 한다.

## 구현 방식

### 프론트엔드

- 기존 `components/CorePhrase.tsx`의 단어장 UI와 분리해 `components/KiipPractice.tsx`를 추가한다.
- `app/page.tsx`의 탭 구조에 `KIIP 연습` 탭을 추가한다.
- 문제 카드, 선택지, 진행률, 결과 화면을 `components/KiipPractice.module.css`로 관리한다.
- 문제 상태는 세션 진행 중에는 React state로 관리하고, 완료 결과만 서버에 저장한다.
- 모바일 우선으로 설계하며, 중앙 모달보다 페이지 안의 학습 흐름을 우선한다.

### API

- `app/api/kiip/route.ts`를 추가한다.
- 액션:
  - `get-session`: 단계·언어·문제 수 기준으로 세션 생성
  - `submit-answer`: 답안 기록 및 정답 판정
  - `complete-session`: 세션 완료와 점수 저장
  - `get-progress`: 사용자별 최근 점수·취약 주제 조회
- 서버에서 정답을 관리하고, 클라이언트에 세션 시작 시 정답을 노출하지 않는다.
- 모든 요청은 기존 `x-device-id` principal 경계를 사용한다.

### 데이터

초기에는 문제은행과 사용자 기록을 분리한다.

- `kiip_questions`
  - `id`, `stage`, `level`, `skill`, `question_type`
  - `prompt_ko`, `prompt_vi`, `context_ko`, `context_vi`
  - `choices`, `answer_index`, `explanation_ko`, `explanation_vi`
  - `source`, `active`, `created_at`
- `kiip_sessions`
  - `id`, `device_id`, `stage`, `question_count`, `score`, `status`
  - `started_at`, `completed_at`
- `kiip_answers`
  - `id`, `session_id`, `question_id`, `selected_index`, `is_correct`, `answered_at`
- `kiip_question_vocabulary`
  - `question_id`, `vocabulary_id` 또는 표준 표현 키

기존 shared Supabase에 적용하기 전에는 migration SQL을 먼저 검토하고, seed 데이터는 소량의 검증용 문제부터 넣는다. 기존 운영 테이블을 변경하지 않는다.

## 디자인 방향

- **Design movement**: 조용한 학습 도구와 대화형 카드 UI를 결합한 “calm utility”
- **Core principles**: 한 화면 한 판단, 즉시 피드백, 문맥 우선, 부담 없는 반복
- **Color philosophy**: 기존 CoreRing의 짙은 네이비를 유지하고, 정답은 차분한 청록, 오답은 낮은 채도의 앰버로 표시한다.
- **Layout paradigm**: 중앙 집중형 시험 화면이 아니라, 상단 진행 상태와 하단 고정 행동 영역을 가진 세로 학습 흐름
- **Signature elements**: 단계 배지, 5칸 진행 인디케이터, 문맥 인용 카드
- **Interaction**: 선택 전에는 선택지를 넓게, 선택 후에는 해설과 다음 행동을 명확하게 한다. 오답을 실패처럼 과장하지 않는다.
- **Animation**: 문제 전환은 짧은 fade/slide만 사용하고, 정답 효과는 200ms 이내로 제한한다.
- **Typography**: 기존 앱 글꼴과 계층을 유지하고, 문제 문장은 본문보다 한 단계 크게 표시한다.
- **Brand essence**: 실제 대화에서 배운 표현을 KIIP 단계 연습으로 이어주는 생활형 한국어 학습 도구.
- **Voice**: “오늘 대화에서 나온 표현을 5문제로 연습해 보세요.” / “틀려도 괜찮아요. 다음 문맥에서 다시 만나요.”

## 단계적 납품

### Phase 1 — 수직 슬라이스

- KIIP 탭
- seed 문제 10개
- 5문제 세션
- 정답/해설/결과 화면
- 로컬 state 기반 진행

### Phase 2 — 지속성

- Supabase migration
- 세션·답안·진도 저장
- 오답 복습
- CorePhrase 단어장 연결

### Phase 3 — 확장

- 2단계 이상 추가
- 듣기/음성 문제
- 실제 채팅 문맥에서 자동 추천
- 다국어 콘텐츠 팩 구조

## 현재 결정

- 먼저 전체 단계가 아니라 **1단계 5문제 MVP**를 만든다.
- 현재 CorePhrase를 유지하고 KIIP 연습을 별도 탭으로 추가한다.
- 공식 KIIP 콘텐츠를 무단 복제하지 않고, 서비스 자체 제작 문항과 공개적으로 사용 가능한 학습 목표를 기준으로 구성한다.
- 배포는 Phase 1의 build·lint·UI 흐름 검증 후 진행한다.
