# ProjectFlare

소규모 팀을 위한 Cloudflare 네이티브 경량 프로젝트 관리 OSS.

ProjectFlare는 Cloudflare Workers, D1, R2, Queues, Zero Trust 위에서 동작하도록 설계된 경량 프로젝트 OS입니다. VPS, Docker 호스트, PostgreSQL, Redis, Nginx, 인증서 운영 없이 작업 관리, 간트 계획, Wiki, GitHub/Webhook 수신, 다국어 관리 화면, 향후 MCP 접근을 함께 다루는 것을 목표로 합니다.

ProjectFlare는 Jira, Linear, Notion, Redmine, OpenProject를 한 번에 대체하려는 제품이 아닙니다. 목표는 엔지니어, 비엔지니어, Webhook, GitHub, AI 에이전트가 같은 프로젝트 정보를 볼 수 있게 하는 작은 Cloudflare 네이티브 운영 레이어입니다.

## 포지셔닝

- GitHub: 구현 추적
- ProjectFlare: 프로젝트 추적과 전달 상태
- Wiki: 사양, 배경, 의사결정, 운영 절차
- Gantt: 일정과 의존성 가시화
- Webhooks: 외부 시스템 입력
- MCP: 향후 AI 에이전트 조작 인터페이스

## 기능

- Cloudflare 호스팅 관리 UI에서 워크스페이스와 프로젝트 관리
- 상태, 우선순위, 담당자, 카테고리, 태그, 마일스톤, 날짜, 진행률, 상위 작업을 포함한 작업 생성
- 프로젝트별 작업 상태, 색상, 순서, 완료/보관 의미 관리
- 중첩 작업, 의존성, 상태 지표, 칸반형 보드, 간단한 간트형 계획 보기
- 최신순 작업 댓글, 제한된 로딩, 긴 텍스트 펼치기
- 작업 설명, 작업 댓글, Wiki 페이지를 Markdown 기반 리치 에디터로 작성
- 작업과 Wiki 페이지에 이미지 및 가벼운 동영상 업로드
- 업로드한 미디어를 댓글 또는 Wiki에 Markdown으로 삽입
- 댓글/Wiki 에디터에 이미지 또는 동영상을 붙여넣기/드롭하여 업로드 및 삽입
- 변경 이력이 있는 Markdown Wiki 페이지 작성 및 편집
- GitHub 저장소 연결 및 issue, comment, pull request webhook 이벤트 수신
- 외부 JSON을 작업으로 변환하는 토큰 기반 Generic Webhook endpoint 생성
- 앱 알림과 Slack, Lark, Generic Webhook 발신 알림
- capability, hook, route, plugin-scoped storage를 선언하는 first-party plugin 설치
- 18개 locale 관리 UI 지원: `ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN`, `zh-TW`
- 아랍어와 페르시아어 RTL 레이아웃 지원

## 문서

- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)

## GitHub 동기화

- GitHub 저장소를 ProjectFlare 프로젝트에 연결
- `/api/github/webhook`에서 GitHub Webhook 수신
- `GITHUB_WEBHOOK_SECRET`이 설정된 경우 `X-Hub-Signature-256` 검증
- Cloudflare Queues를 통해 GitHub webhook 처리
- GitHub issues를 작업으로 동기화
- GitHub issue comments를 작업 댓글로 동기화
- PR 본문에 GitHub issue URL이 포함된 경우 pull request 이벤트에서 연결된 작업 업데이트

로컬 개발에서는 GitHub webhook secret이 선택 사항입니다. 운영 환경에서는 `GITHUB_WEBHOOK_SECRET`을 Worker secret으로 설정합니다.

## Webhook 및 알림

- 프로젝트별 토큰 기반 Generic Webhook endpoint 생성
- `Authorization: Bearer <token>` 또는 `X-ProjectFlare-Token` 수신 인증
- endpoint별 `source`와 기본 우선순위 간단 매핑
- Webhook 작업, 댓글, GitHub issue/comment/PR 이벤트에 대한 앱 알림 저장
- Generic Webhook, Slack, Lark 호환 URL용 발신 알림 채널 추가
- Slack Incoming Webhook block payload 또는 간단한 JSON payload를 설정된 채널로 전송

UI에서 만든 Generic Webhook token은 한 번만 표시됩니다. 외부 시스템에 저장해 사용하세요.

## 프론트엔드

관리 UI는 `apps/web` 아래의 React/Vite 앱입니다.

- 프로젝트 전환, 요약 지표, 작업 테이블, 댓글 패널
- 의존성 라벨이 있는 간단한 간트형 계획 보기
- 작업 설명, 댓글, Wiki 페이지용 Lexical 기반 Markdown 에디터
- Wiki 페이지 목록, 미디어 첨부, revision 목록
- GitHub 이벤트, Generic Webhook endpoint, 알림 채널, 앱 알림을 다루는 연동 보기
- 현재 지원하는 18개 locale 언어 선택기

언어 선택은 `localStorage`의 `projectflare.locale`에 저장됩니다.

## 배포

ProjectFlare는 Wrangler와 `wrangler.toml`에 선언된 Cloudflare 리소스로 배포합니다. 기본 OSS 흐름에는 Terraform이나 setup shell script가 필요하지 않습니다.

D1, R2, Queues, Access, secrets, migrations, deploy commands는 [Deployment](./docs/deployment.md)를 참고하세요.

## Generic Webhook

다음으로 JSON을 POST합니다.

```txt
/api/webhooks/generic/:projectId
```

예:

```json
{
  "title": "Investigate failed checkout",
  "description": "Stripe dispute from customer report",
  "source": "stripe",
  "priority": "urgent",
  "dueDate": "2026-06-18",
  "assignee": "ops@example.com",
  "labels": ["support", "billing"],
  "externalUrl": "https://example.com/cases/123"
}
```

## 비목표

초기 ProjectFlare 범위는 Jira, Linear, Notion, Redmine 전체 대체를 의도하지 않습니다. 우선순위는 작업, GitHub, Wiki, 간트 계획, Webhook 수신을 낮은 운영 비용으로 연결하는 Cloudflare-only 기반입니다.
