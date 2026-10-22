# Orbit 프론트 작업 규칙

이 문서의 경로는 `dino-web-tmp/`를 기준으로 합니다. 화면 범위·라우트·흐름·소유권은 [UI 구현 계획](docs/ui-plan.md)이 기준입니다.

## 스택과 명령

- Vite 7 + React 19 + TypeScript 5.9(strict) + React Router 7 + Zustand 5, 스타일은 CSS Modules + `src/styles`의 CSS 변수
- `npm run dev` 개발 서버, `npm run typecheck` 타입 검사, `npm run build` 타입 검사 + 프로덕션 빌드
- `node scripts/shot.mjs <url> <out.png> [--click sel] [--fill sel=value] [--wait ms] [--full] [--height px]` 1920×1080 스크린샷
- `npm run seed:local`로 로컬 Postgres·Redis를 초기화하고 API 기반 개발 데이터를 넣습니다. 보존할 데이터가 없는 로컬 환경에서만 실행합니다.
- `node scripts/check-flows.mjs [baseUrl] [flow ...]`는 실행 중인 실제 백엔드를 대상으로 교차 흐름을 점검합니다(클릭 단계 재현 + 콘솔 오류 확인, `VIEWPORT=1440x900`로 창 크기 변경).
- Tailwind 등 새 스타일 체계나 UI 라이브러리를 추가하지 않습니다. 새 의존성은 꼭 필요할 때만 추가하고 이유를 보고합니다.

## 구현 규칙

- Figma에 있는 화면·상태·모달만 구현합니다. 설명용 화면, 화면 목록, 테스트 패널, 안내 토스트를 추가하지 않습니다.
- 디자인 값은 `src/styles/tokens.css`의 변수와 `typography.css`의 `t-*` 클래스를 씁니다. 토큰에 없는 값만 Figma 수치를 그대로 씁니다.
- 공통 UI는 `src/design-system`의 컴포넌트를 재사용합니다. Figma 노드가 DS 컴포넌트 인스턴스이면 해당 컴포넌트를 씁니다.
- 레이아웃은 1920px 캔버스 기준입니다. Figma 오토레이아웃은 flex/grid로, 고정 배치는 Figma 수치로 옮깁니다. `vh`·`vw`는 쓰지 않고 높이는 `var(--app-height)`를 씁니다.
- 모달·드롭다운 포털 대상은 `#overlay-root`입니다.
- 화면은 `useAppStore`(`src/data/store.ts`)와 `src/data/selectors.ts`로 읽고, `src/data/sync.ts` 훅으로 동기화합니다. 쓰기는 스토어 액션을 호출하고 비동기 결과를 기다립니다.
- 서버 호출은 `src/api/endpoints.ts`, DTO↔화면 도메인 변환은 `src/data/mappers.ts`에 모읍니다. 임시 개발 로그인(`src/api/devAuth.ts`)의 직접 인증 호출은 제거 예정인 예외입니다.
- `../server/` 코드가 API 계약의 기준이며 프론트 흐름에 맞추려고 서버 코드를 바꾸지 않습니다. 화면별 연결·제약은 [백엔드 연동 가이드](../api-integration-guide.html)를 참고합니다.
- 작업 상태 표기는 `TASK_STATUS_LABEL`을 씁니다(등록·배정됨·작업전·작업중·완료·취소, 거절·지연은 배지).
- 소유하지 않은 경로는 수정하지 않습니다([소유권](docs/ui-plan.md#6-공통-계약과-파일-소유권)).

## Figma 사용

- 파일 키 `5K4KURRdWETTXsnlurK6jK`. 프레임 목록·노드 구조·저해상도 스크린샷은 `.figma/`에 있습니다(`frames.json`, `meta/`, `survey/`).
- Figma MCP 읽기 호출은 하루 200회·분당 10회 제한이 있습니다. 한 번에 하나씩 호출하고, 작업마다 받은 예산을 넘기지 않습니다.
- 구현 기준은 `get_design_context` 결과입니다. 호출 전에 `skill://figma/figma-design-to-code/SKILL.md`를 읽고, 결과 코드는 이 프로젝트 방식(CSS Modules·토큰·DS 컴포넌트)으로 옮깁니다.
- 결과에 포함된 에셋 URL(이미지·SVG)은 7일 동안 유효합니다. 사용하는 에셋은 모두 내려받아 저장소에 넣고 임시 URL을 코드에 남기지 않습니다.
- 받은 스크린샷은 `.figma/ref/<section>/<nodeId>.png`로 복사해 검증에 재사용합니다.
- `use_figma`는 읽기 전용 스크립트로만 씁니다(호출 전 `skill://figma/figma-use/SKILL.md`). 반환값 20KB 제한, 호출당 스크린샷 5장까지입니다. Figma 파일을 수정하지 않습니다.

## 검증

- `npm run typecheck`가 통과해야 합니다. 다른 담당의 진행 중 오류는 자기 경로 오류와 구분해 보고합니다.
- 구현한 화면마다 `scripts/shot.mjs`로 1920×1080 스크린샷을 찍어 Figma 기준 스크린샷과 비교합니다. 검증 스크린샷은 `.shots/`에 둡니다(Git 제외).
- 버튼 흐름은 클릭 단계로 재현해 확인합니다. 브라우저 콘솔 오류가 없어야 합니다.
- 완료 보고에는 변경 파일, 구현한 프레임, 실제 수행한 검증, Figma와 다른 점과 이유, 미확인 사항을 적습니다.
