# Paragraph Message Splitter for SillyTavern

AI 메시지의 버튼을 눌렀을 때, 문자 수 기준 중앙에 가장 가까운 **문단 경계**에서 두 개의 메시지로 나눕니다. 자동으로 분리하지 않습니다.

## 사용 방법

1. 분리할 AI 메시지에서 우측 상단의 `⋯` **Message Actions** 버튼을 누릅니다.
2. 절반 아이콘(½, **문단 기준으로 두 메시지로 분리**)을 누릅니다.
3. 메시지가 두 개로 분리되고 채팅에 바로 저장됩니다.

## 분할 규칙

- 원문의 문자 수 중앙에서 가장 가까운 문단 사이를 선택합니다.
- 빈 줄로 구분된 문단 사이에서만 자릅니다.
- Markdown 코드 블록 안의 빈 줄은 분할 지점으로 사용하지 않습니다.
- 안전한 문단 경계가 없으면 원문을 변경하지 않고 알림을 표시합니다.
- 여러 스와이프가 있는 메시지는 서로 다른 답변이 어긋나는 것을 막기 위해 분리하지 않습니다.
- 첨부 파일, 이미지, 추론 내용은 첫 번째 메시지에 유지됩니다.
- 이미 한 번 분리된 메시지도 문단이 남아 있다면 버튼으로 다시 나눌 수 있습니다.

## 설치

1. 압축을 풀어 `ST-Paragraph-Split` 폴더를 아래 위치에 넣습니다.

   `SillyTavern/public/scripts/extensions/third-party/`

2. SillyTavern 페이지를 새로고침합니다.

정상 설치되면 브라우저 개발자 콘솔에 `[Paragraph Message Splitter] Loaded in manual button mode.`가 표시됩니다.

## 호환성

SillyTavern의 공개 `SillyTavern.getContext()` API를 사용하며, 2026-08 기준 release 브랜치 API 구조에 맞춰 작성했습니다.
