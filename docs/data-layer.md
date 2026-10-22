# 데이터 계층

화면은 `useAppStore`와 `src/data/selectors.ts`로 읽고 스토어 액션으로 쓴다. `src/data/sync.ts` 훅이 실제 백엔드를 읽어 화면 상태를 맞춘다. 서버 코드가 API 계약의 기준이며 프론트에 맞추려고 수정하지 않는다. 화면 범위는 [UI 구현 계획](ui-plan.md), 화면별 API와 제한은 [백엔드 연동 가이드](../../api-integration-guide.html)를 따른다.

## 1. 파일

| 파일 | 내용 |
| --- | --- |
| `src/api/http.ts` | `/api/v1`, Bearer 토큰, 공통 응답 봉투, `ApiError`·`NetworkError`, 파일 응답 |
| `src/api/token.ts` | 토큰·계정 ID·선택 발주사 localStorage 저장 |
| `src/api/endpoints.ts` | 인증·프로필·조직·작업·알림 API 경로와 요청 |
| `src/api/types.ts` | 서버 DTO·요청 타입 |
| `src/api/devAuth.ts` | TEMP 개발 로그인: 로컬 JWT 서명·페르소나 선택. 실제 카카오 연결 시 제거 |
| `src/data/types.ts` | 화면 도메인 타입 |
| `src/data/store.ts` | `AppState`, `useAppStore`, 비동기 액션·읽기·오류 처리·캐시 |
| `src/data/mappers.ts` | DTO↔도메인, ID·시각·코드·색 변환 |
| `src/data/sync.ts` | 화면 진입·날짜·작업·발주사·revision 변경 시 재조회 |
| `src/data/selectors.ts` | `select*`·`get*`·`use*` |
| `src/data/rules.ts` · `constants.ts` | 순수 상태 규칙·이력 문구·선택지 |
| `src/lib/date.ts` · `format.ts` | Asia/Seoul 날짜·실제 현재 시각·화면 포맷 |
| `scripts/dev-seed.mjs` | 로컬 DB·Redis 초기화, API와 SQL로 개발 데이터 구성 |
| `src/app/RequireAuth.tsx` | 로그인 가드 |

## 2. 사용법

### 읽기

```tsx
import { useAppStore } from '@/data/store';
import { selectTaskById, useBoardSummary, useWaitingTasks } from '@/data/selectors';
import { today } from '@/lib/date';

const task = useAppStore((s) => selectTaskById(s, taskId)); // select*: 안정 참조라 바로 넘겨도 된다
const waiting = useWaitingTasks(); // 파생 배열은 use* 훅
const summary = useBoardSummary(today());
```

- Zustand v5에서는 `useAppStore`에 넘긴 셀렉터가 매번 새 배열·객체를 돌려주면 무한 렌더 경고가 난다. `useAppStore((s) => s.tasks.filter(...))`처럼 쓰지 말고 `use*` 훅을 쓰거나, 필요한 조각만 구독한 뒤 `useMemo`로 `get*` 계산 함수를 부른다. 여러 값을 한 번에 꺼낼 때는 `useShallow`(`zustand/react/shallow`)를 쓴다.
- 액션은 `const cancelTask = useAppStore((s) => s.cancelTask)`로 꺼내거나 이벤트 핸들러에서 `useAppStore.getState().cancelTask(...)`로 부른다.
- 날짜·시각은 모두 Asia/Seoul 기준이다. 오늘은 `today()`, 현재 일시는 `nowIso()`(`src/lib/date.ts`).

### 액션 동작

서버 변경 액션은 비동기다. 화면 이동·모달 닫기는 반환 계약에 맞춰 `await` 뒤에 처리한다. `Promise<void>`는 성공 여부를 나타내는 boolean이 아니다. 이력·상태는 임의로 합성하지 않고 서버 응답을 매핑해 다시 읽는다.

```tsx
const id = await useAppStore.getState().createTask(input);
if (id === null) return; // 실패: 성공 화면으로 이동하지 않는다
const result = await useAppStore.getState().assignTask(id, assignment);
if (result === 'stale') {
  // 기존 '변경된 정보입니다' 모달을 연다
}
```

| 액션 | 반환·동작 |
| --- | --- |
| `loginWithKakao()` | `Promise<{ needsOnboarding: boolean }>`; 현재는 devAuth로 토큰을 만든 뒤 프로필·소속·데이터를 읽는다 |
| `registerProfile`, `createCompany`, `withdrawAccount` | `Promise<boolean>`; 성공 여부로 다음 화면 진행을 결정한다 |
| `createTask`, `addType` | `Promise<ID \| null>`; 생성 ID 또는 실패 |
| `assignTask` | `Promise<AssignResult>`: `applied` / `stale` / `failed`. 서버 버전을 `expectedVersion`으로 보낸다 |
| `cancelTask`, `requestReport` | `Promise<void>`; 서버 변경 뒤 작업 상세·목록을 다시 읽는다 |
| `exportTasks(filter)` | `Promise<void>`; 현재 필터로 `GET /organizations/{id}/works/export`, `작업내역_날짜.xlsx` 다운로드 |
| `updateProfile`, `updateCompany`, `issueJoinCode`, `regenerateJoinCode` | `Promise<void>`; 프로필·조직·회사 코드 API |
| `setMemberType`, `assignOwner`, `releaseOwner`, `approveJoinRequests`, `rejectJoinRequests` | `Promise<void>`; API 후 소속 또는 조직을 다시 읽는다 |
| `updateType`, `deleteType` | `Promise<void>`; API 후 목록 재조회. 삭제된 유형은 현재 탭의 표시용 캐시에 보관한다 |
| `markNotificationRead` | `Promise<void>`; 먼저 읽음 표시하고 서버 읽음 API를 보낸다 |
| `logout`, `switchCompany`, `finishOnboarding` | 동기 액션. 로그아웃·발주사 전환 내부에서는 필요한 비동기 처리를 시작한다 |

### 화면 동기화 훅

로그인 상태이며 현재 발주사가 있을 때 동작한다. 변경 뒤 `revision`이 늘면 활성 화면을 다시 읽는다. 폴링이나 다른 탭 변경의 실시간 구독은 아니다.

| 훅 | 읽는 데이터 |
| --- | --- |
| `useTimetableSync(date)` | 선택 날짜 타임테이블·대기함 |
| `useBoardSync(date)` | 해당 날짜 진행 보드 |
| `useTaskListSync()` | 작업 목록 전체 페이지·대기함 |
| `useTaskDetailSync(taskId)` | 작업 상세·이력·보고 |
| `useTechnicianHistorySync(memberId)` | 해당 기사 관련 작업·완료·거절 작업 상세 |
| `useNotificationsSync()` | 알림 전체 페이지(현재 발주사·지원하는 알림 유형만 표시) |
| `useOrganizationSync()` | 발주사·회사 코드·인력·승인대기·유형. 인력·승인대기는 OWNER만 조회 |
| `useWithdrawalEligibilitySync()` | 계정 탈퇴 가능 여부 |

### 오류와 로컬 전용 동작

- `call()`은 성공 결과를 돌려주고 실패하면 `undefined`를 돌려준다. 네트워크 연결 실패는 `network: 'offline'`, HTTP 401·`COMMON-404`·`AUTH-004`는 세션 초기화·로그아웃으로 처리한다. 서버 오류 코드·메시지는 콘솔에 남기며 새 오류 토스트는 만들지 않는다.
- '다시 시도'는 `setNetwork('online')`으로 소속·공통 데이터·현재 화면을 다시 읽는다. 서버가 계속 끊겨 있으면 다시 실패한다.
- 배정의 `SCHEDULE-016`은 `stale`로 반환해 기존 모달을 연다. `SCHEDULE-008`(동일 배정)은 `applied`로 취급한다.
- 서버 API가 없는 `changeMemberKind`(직원↔기사), `setTypeActive`(유형 활성 상태), `deleteNotification`(숨김), 프로필 사진은 로컬 전용이다. 유형 활성 상태·숨긴 알림은 재조회에도 유지하지만 새로고침하면 사라진다. 역할 변경은 인력 재조회로 덮일 수 있고 서버 작업 배정을 해제하지 않는다.
- `agreeTerms`는 선택을 잠시 기억하고 `registerProfile`이 프로필 저장 후 동의 API를 보낸다. `setJoinRequestKind`도 승인 전 선택값이며 승인 요청에 함께 보낸다.
- 사진 업로드 API가 없어 신규 현장 사진은 등록 요청에 보내지 않는다. 응답 사진의 `fake-photo://` 접두어는 매퍼에서 제거한다.

## 3. ID·시각·개발 로그인

| 대상 | 화면 ID 예 | 서버 ID |
| --- | --- | --- |
| 직원 소속 | `s12` | membershipId 12 |
| 기사 계약 | `t7` | technicianId 7 |
| 직원·기사·작업 유형 | `st3` · `tt3` · `wt3` | 각 테이블 숫자 ID 3 |
| 발주사·작업·알림·참여 요청 | `"12"` | 숫자 12 |
| 인력 목록에 없는 로그인 사용자 | `me` | 표시용 ID; API 숫자 ID가 아니다 |

`toId`·`fromId`·`typeIdNumber`를 사용한다. 서버 테이블별 숫자가 겹치므로 접두어를 임의로 없애지 않는다. 서버 UTC ISO는 화면에서 `+09:00` ISO·`YYYY-MM-DD`·`HH:mm`으로 바꾼다. 요청은 `toUtcIso`, 날짜 조회 범위는 `dayRange`의 KST 자정부터 다음 날 자정까지 `[from, to)`를 쓴다. 현재 시각은 실제 `Date.now()`이며 시연 시계는 없다.

개발 로그인은 기본 오르빗(OWNER), `?role=staff` 김운영(STAFF), `?user=new` 미가입 계정, `?reset=1` 기본 선택이다. 선택은 sessionStorage `orbit:devLogin`, 인증 토큰·계정 ID·선택 발주사는 localStorage에 남는다. 이미 로그인했다면 로그아웃 후 쿼리로 다시 로그인한다. 선택 초기화는 서버 데이터를 지우지 않는다. devAuth는 서버의 로컬 JWT 키로 HS256 토큰을 만드는 개발 서버 전용 임시 구현이다. 실제 카카오는 nonce 발급 → SDK → login API로 교체해야 한다.

## 4. 시드

`npm run seed:local`은 **로컬 Postgres public 테이블 전체를 TRUNCATE하고 Redis DB를 FLUSHDB**한다. 서버를 먼저 실행하고 보존할 데이터가 없는 로컬 환경에서만 쓴다. 로컬 이외 DB·API 호스트는 거부한다. DB 기본 연결은 `localhost:54321/postgres`, Redis는 `127.0.0.1:6379`, API는 `http://localhost:8080`이다. DB는 `DATABASE_*`/`PG*`, API는 `API_BASE`로 지정한다. JWT 키·issuer는 환경 변수 또는 `../server/.env`에서 읽는다.

계정은 SQL로 만들고 프로필·약관·회사·참여·유형·작업 등록 등은 API로 처리한다. 기사 수락·거절·작업 시작·완료 보고·과거 시각·작업유형 연결은 SQL로 보완한다. 날짜는 실행 시점의 Asia/Seoul 오늘 기준이며 과거 사건 시각은 현재보다 뒤가 되지 않게 제한한다. 서버 재시작 시 local 프로필의 create-drop으로 데이터가 사라질 수 있다.

| 데이터 | 생성 내용 |
| --- | --- |
| 발주사 | OO건설(냉난방 설비, 오르빗 OWNER), 협력 발주사(종합 시설관리, 협력관리자 OWNER·오르빗 STAFF) |
| 직원 | 오르빗·김운영·박서준·이지은·송지환·양서희 |
| 기사 | 김민수·김민준·이민준·홍길동·김태훈·박서연·이철호·이준혁·최동욱. 최동욱은 과거 완료 작업 생성 후 비활성화 |
| 유형 | 직원 4종(관리자·배차 담당·사무 지원·현장 담당), 기사 5종(전문 기사·설치 기사·A/S 기사·전기 기사·보조 기사), 작업 4종(설치·점검·수리·세척). 유형 활성 상태는 서버에 없으므로 모두 활성으로 읽는다 |
| 미가입 계정 | 온보딩용 5개. 모두 사용했다면 다시 시드한다 |
| 승인대기 | 정하늘·오세훈·윤도현·장예린 기사, 한지우·서민재·임채원 직원. 회사 코드·참여 링크·QR 채널을 번갈아 사용 |
| 작업 | 52건: 오늘 기본 18건, 어제 7건, 내일 5건, 모레 1건, 지난 완료 9건, 등록 10건, 취소 2건 |
| 보고 요청 | `demo-no-report`는 요청 없음. `demo-delayed`에는 종료 이후의 과거 요청을 남긴다. 이른 시각에 시드하면 이 작업을 어제로 옮긴다 |
| 사진 | 현장·완료 전후 사진은 `placehold.co` URL이다. 실제 사용자 업로드가 아니다 |
| 알림 | 작업 API가 만든 알림과 등록자별 수락·거절·완료 보고 SQL 알림. 사무실 알림은 등록자별 최근 2건을 안 읽음으로 설정한다. 계정별 목록이므로 고정 12건이 아니다 |

`.env.development.local`에 개발 JWT 설정·계정 ID를, `.dev-seed.json`에 숫자 ID 매핑을 쓴다. 주요 키는 `organizationIds`, `accountIds`, `membershipIds`, `technicianIds`, `categoryIds`(`staff`·`technician`·`work`), `workIds`, `pendingParticipationRequestIds`, `newAccountIds`다. 파일의 값은 시드 결과이며 코드에 하드코딩하지 않는다.

`workIds`의 `demo-pending`, `demo-accepted`, `demo-in-progress`, `demo-delayed`, `demo-completed`, `demo-no-report`, `demo-rejected`, `demo-conflict`, `demo-stale`, `task-01` 등은 **검색용 라벨이지 라우트 ID가 아니다**. `/tasks/<workIds의 숫자>`, `/board/<숫자>`로 연다. `demo-stale`은 일반 등록 작업이며 자동 충돌 트리거가 아니다. 동시 배정으로 서버 버전이 달라져야 변경정보 모달이 열린다.

## 5. 정의와 규칙

- **작업 상태**: 기사·날짜·시작 시각·소요 시간이 모두 있어야 배정 상태다(`hasFullAssignment`). 등록은 대기함, 배정됨·작업전·작업중·완료는 격자·보드(`isScheduledStatus`). 거절은 `status: 'REGISTERED'` + `rejection`(기사·시간은 비워진다), 지연은 `delayed: true` 배지다. 표기는 `TASK_STATUS_LABEL`.
- **진행 보드 집계**(`getBoardSummary`/`useBoardSummary`): 그 날짜의 배정됨·작업전·작업중·완료 작업(등록·취소 제외)이 대상이다. 총 작업 = 진행중 + 지연 + 완료. 진행중 = 배정됨·작업전·작업중 중 지연이 아닌 작업, 지연 = 완료 전 지연 작업, 완료 = 완료 작업. 탭 개수는 `byStatus`(전체 = `total`).
- **보고 미제출**(`isReportOverdue`): 작업중인데 종료 예정 시각이 지났고 보고가 없다. 작업 상세의 '종료 예정 시각이 지났는데 보고가 없어요' 기준이다.
- **대기함 미처리 사유**(`getUnassignedReason`): '담당기사 · 시간 미지정', '담당기사 미지정', '시간 미지정'.
- **이력 문구**(`HISTORY_LABEL`): 작업 등록됨, 배정 알림 발송됨, 기사 수락, 기사 거절, 작업 시작, 완료 보고 제출, 작업 취소, 일정 변경, 배정 해제, 작업 정보 수정, 완료 보고 요청. 처리자는 직원이면 이름, 기사면 '이름 기사'. 이력은 오래된 순이다.
- **완료 보고**: `report.content`는 `작업 메모\n\n[사용 부품]\n부품` 형식이고 `splitReportContent`로 나눈다. `report.photoUrls[0]`은 작업 전 사진, `[1]`은 작업 후 사진이다.
- **사진**: 첨부 파일은 서버 상세의 현장 사진에서 매핑한다. 신규 현장 사진 업로드는 미지원이다.
- **유형 삭제**: 서버 삭제 API 결과를 다시 읽는다. 현재 탭에서 삭제한 유형은 `getDeletedType`으로 이름·색을 유지한다.
- **총관리자**: 인력의 `isOwner`와 소속 역할을 API 결과로 맞춘다. 지정 액션은 새 총관리자를 지정한 뒤 기존 총관리자를 해제한다. 서버의 유일 총관리자 탈퇴 차단은 아직 없으므로 화면 소속 규칙도 유지한다.
- **정렬**: 작업 목록 최근 수정 순, 대기함 등록 오래된 순, 날짜별 작업 시작 시각 순, 알림·승인대기 최신순, 인력 총관리자 → 직원 → 기사(참여일 순), 유형 만든 순.

## 6. 셀렉터·훅(`src/data/selectors.ts`)

`select*`는 `useAppStore`에 바로 넘겨도 되고, `get*`·`sort*`는 새 배열을 만드는 계산 함수라 훅·`useMemo` 안에서만 쓴다.

| 이름 | 반환 |
| --- | --- |
| `selectCurrentUser` · `useCurrentUser()` | 로그인 사용자 `Member` |
| `selectCurrentCompany` · `useCurrentCompany()` | 현재 발주사 |
| `selectCurrentMembership` · `useCurrentMembership()` | 현재 발주사 소속(역할) |
| `selectCurrentRole`, `selectIsOwner` · `useIsOwner()` | 현재 역할, 총관리자 여부 |
| `useOwnedMemberships()` | 총관리자인 소속 발주사(계정 탈퇴 불가 사유) |
| `selectIsLoggedIn`, `selectIsOffline` | 로그인 여부, 네트워크 실패 여부 |
| `selectOwnerMember` | 현재 발주사 총관리자 인력 |
| `selectMemberById` · `useMember(id)` | 인력 하나 |
| `selectTypeById` · `useType(id)` | 유형 하나(삭제된 유형 포함) |
| `selectTaskById` · `useTask(id)` | 작업 하나 |
| `selectNotificationById` | 알림 하나 |
| `selectUnreadNotificationCount` · `useUnreadNotificationCount()` | 안 읽은 알림 수 |
| `selectJoinRequestCount` · `useJoinRequestCount()` | 승인대기 수 |
| `selectWaitingTaskCount` | 대기함 작업 수 |
| `useMembers()` / `sortMembers` | 인력 전체(정렬) |
| `useEmployees()` / `getEmployees` | 직원 |
| `useTechnicians()` / `getTechnicians` | 기사 전체(비활성 포함, 인력관리용) |
| `useActiveTechnicians()` / `getActiveTechnicians` | 활성 기사(배정 선택지·타임테이블 행) |
| `useTypes(category)` / `getTypesByCategory` | 분류별 유형(비활성 포함, 유형 설정 목록) |
| `useActiveTypes(category)` / `getActiveTypesByCategory` | 분류별 활성 유형(선택지·필터) |
| `isTypeNameTaken(types, category, name, exceptId?)` | 같은 분류 이름 중복 여부(공백 무시) |
| `useVisibleTasks()` / `getVisibleTasks` | 취소 제외 작업(작업 목록) |
| `useWaitingTasks()` / `getWaitingTasks` | 대기함(등록, 거절 포함) |
| `useTasksByDate(date)` / `getScheduledTasksByDate` | 날짜별 배정됨·작업전·작업중·완료 작업(격자·보드 표) |
| `useBoardSummary(date)` / `getBoardSummary` | 진행 보드 집계 `BoardSummary` |
| `getUnassignedReason(task)` | 대기함 미처리 사유 |
| `findScheduleConflicts(tasks, assignment, excludeId?)` | 같은 기사·시간대에 겹치는 작업(일정 충돌 경고) |
| `useTechnicianOpenTasks(id)` / `getTechnicianOpenTasks` | `{ inProgress, scheduled }`(역할 변경 모달) |
| `useTechnicianHistory(id)` / `getTechnicianHistory` | 기사 작업이력 행·누적 완료·이번 달 거절·완료 |
| `useRegistrants()` / `getRegistrants` | 등록자 목록(작업 목록 등록자 필터) |
| `useNotifications()` / `sortNotifications` | 알림 최신순 |
| `useJoinRequests()` / `sortJoinRequests` | 승인대기 최신순 |
| `hasFullAssignment`, `isScheduledStatus`, `isAssignableTechnician` | 상태 규칙 |
| `getTaskEndTime`, `getTaskStartMs`, `getTaskEndMs`, `isReportOverdue` | 작업 시간 계산, 보고 미제출 여부 |

## 7. 포맷터(`src/lib/format.ts`)·날짜(`src/lib/date.ts`)

| 함수 | 예 |
| --- | --- |
| `formatTimetableDate(date)` | '2026. 10.21 (수)' |
| `formatBoardDate(date)` | '2026년 12월 18일 (오늘)', 오늘이 아니면 '(금)' |
| `formatTimeRange(start, minutes, sep?)` | '09:00 - 11:00', `sep '-'`이면 '13:00-15:00' |
| `formatTaskTime(task, sep?)` | 작업 예정 시간. 시간이 없으면 `null` |
| `formatDuration(minutes)` | '2시간', '1시간 30분', '30분' |
| `formatRelativeTime(at)` | '방금 전', 'N분 전', 'N시간 전', 'N일 전', 'N개월 전' |
| `formatElapsedSinceRegistered(at)` | '등록 3일 경과'(당일 0일) |
| `formatDetailDate(date)` · `formatDetailDateTime(date, time)` | '2025-01-23(목)' · '2025-01-23(목) 09:00' |
| `formatHistoryDateTime(at)` | '2025-01-23 08:45' |
| `formatMonthDayWeekday(date)` · `formatMonthDayWeekdayTime(date, time)` | '1월 23일 (목)' · '1월 23일 (목) 11:00' |
| `formatNotificationTime(at)` | 오늘 '오후 03:15', 이전 '10.01 15:15' |
| `formatNotificationGroup(at)` | '오늘', '어제', '2026.09.30' |
| `formatKoreanDate(date)` · `formatKoreanDateTime(at)` | '2024년 1월 15일' · '2024년 1월 15일 14:30' |
| `formatJoinDate(at)` | '2026-02-28' |
| `formatMonthDay(date, sep?)` · `formatDateDot(date)` | '09-24', '09/26' · '2026.09.30' |
| `formatAmPmTime(hm)` · `formatKoreanHour(hm)` | '오후 03:15' · '오후 2시' |
| `formatPrice(won)` · `formatNumber(n)` | '120,000원' · '120,000' |
| `formatPhone(raw)` | '010-1234-5678'(입력 중 값도 단계적으로) |
| `formatFileSize(bytes)` | '2.3MB' |
| `splitReportContent(content)` · `joinReportContent(memo, parts)` | 완료 보고 메모·사용 부품 |
| `clockNow()` | 실제 현재 시각(epoch ms, `Date.now()`) |
| `today()`, `nowIso()`, `addDays`, `diffDays`, `weekdayLabel`, `isToday` | 날짜 계산 |
| `hmToMinutes`, `minutesToHm`, `addMinutesToHm`, `nowMinutes` | 'HH:mm' ↔ 분, 현재 시각(분, 타임테이블 현재 시각선) |
| `combineDateTime`, `toIsoDate`, `toHourMinute`, `toKstParts`, `startOfMonth`, `isSameMonth` | 일시 변환 |

## 8. 라우트 가드

`src/app/router.tsx`에서 앱 레이아웃 라우트(`/timetable`·`/tasks`·`/board`·`/org`·`/notifications`·`/mypage`)를 `RequireAuth`로 감싼다. 로그아웃 상태로 앱 경로에 들어오면 `/login`으로 바꿔 보내고 원래 경로를 `location.state.from`에 담는다(로그인 후 그 경로로 간다). 앱 화면을 보던 중 로그아웃·탈퇴하면 담지 않아 다시 로그인하면 `/timetable`로 간다. `/`, `/login`, `/onboarding/*`는 공개다. 섹션 라우트는 lazy로 불러온다.

작업 상세는 `tasksLoaded`, 알림 상세는 `tasksLoaded && notificationsLoaded`, 기사 작업이력은 `organizationLoaded`를 기다린 뒤 없는 ID인지 판단한다. 아직 API를 읽는 중인 빈 배열을 없는 데이터로 오인해 목록으로 보내지 않는다. 발주사 전환·세션 초기화 때 로딩 플래그도 초기화한다.
