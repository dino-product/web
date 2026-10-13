# 목업 데이터 계층

섹션 담당이 화면 데이터를 읽고 쓰는 방법입니다. 백엔드 호출 코드는 만들지 않고 `useAppStore`와 `src/mocks/selectors.ts`만 씁니다. 화면 범위·흐름은 [UI 구현 계획](ui-plan.md)이 기준입니다.

## 1. 파일

| 파일 | 내용 |
| --- | --- |
| `src/mocks/types.ts` | 도메인 타입 계약(읽기 전용, orchestrator 소유) |
| `src/mocks/store.ts` | `useAppStore`, `AppState` 계약, 액션 구현, `getDeletedType` |
| `src/mocks/selectors.ts` | 셀렉터(`select*`)·계산 함수(`get*`)·훅(`use*`) |
| `src/mocks/seed.ts` | 시드 생성 `createSeed`, `SEED_MEMBER_IDS`, `SEED_TYPE_IDS`, `mockPhotoUrl` |
| `src/mocks/scenario.ts` | URL 쿼리 시나리오 `readScenario`, `DEFAULT_SCENARIO` |
| `src/mocks/constants.ts` | 이력 문구 `HISTORY_LABEL`, 시연용 작업 ID `DEMO_TASK_IDS`, 선택지(취소 사유·결제 방식·업종) |
| `src/mocks/rules.ts` | 상태 규칙 순수 함수. 화면용 규칙은 `selectors.ts`가 다시 내보낸다 |
| `src/lib/date.ts` | Asia/Seoul 날짜·시간 유틸 |
| `src/lib/format.ts` | 화면 표시 포맷 |
| `src/app/RequireAuth.tsx` | 로그인 가드(로그아웃 상태면 `/login`) |

## 2. 사용법

### 읽기

```tsx
import { useAppStore } from '@/mocks/store';
import { selectTaskById, useBoardSummary, useWaitingTasks } from '@/mocks/selectors';
import { today } from '@/lib/date';

const task = useAppStore((s) => selectTaskById(s, taskId)); // select*: 안정 참조라 바로 넘겨도 된다
const waiting = useWaitingTasks(); // 파생 배열은 use* 훅
const summary = useBoardSummary(today());
```

- Zustand v5에서는 `useAppStore`에 넘긴 셀렉터가 매번 새 배열·객체를 돌려주면 무한 렌더 경고가 난다. `useAppStore((s) => s.tasks.filter(...))`처럼 쓰지 말고 `use*` 훅을 쓰거나, 필요한 조각만 구독한 뒤 `useMemo`로 `get*` 계산 함수를 부른다. 여러 값을 한 번에 꺼낼 때는 `useShallow`(`zustand/react/shallow`)를 쓴다.
- 액션은 `const cancelTask = useAppStore((s) => s.cancelTask)`로 꺼내거나 이벤트 핸들러에서 `useAppStore.getState().cancelTask(...)`로 부른다.
- 날짜·시각은 모두 Asia/Seoul 기준이다. 오늘은 `today()`, 현재 일시는 `nowIso()`(`src/lib/date.ts`).

### 액션 동작

모든 작업 변경은 `updatedAt`을 바꾸고 `history`에 항목(`HISTORY_LABEL` 문구, 처리자 이름)을 덧붙인다. 처리자는 로그인 사용자 이름(기본 '오르빗')이다.

| 액션 | 동작 |
| --- | --- |
| `createTask(input)` | 기사·날짜·시작 시각·소요 시간이 모두 있으면 `PENDING_ACCEPT`(이력 '작업 등록됨'·'배정 알림 발송됨', 신규 배정 알림), 하나라도 없으면 `REGISTERED`(이력 '작업 등록됨'). 등록자는 로그인 사용자. `sitePhotoUrls`(최대 6장)는 첨부 파일(`attachments`)로도 만든다. 새 ID를 돌려준다 |
| `assignTask(id, assignment)` | 등록·배정됨·작업전 작업만. `PENDING_ACCEPT`로 바꾸고 기사·날짜·시각·소요 시간 설정, 거절 정보·지연 해제. 같은 기사의 시간만 바뀌면 이력 '일정 변경'+일정 변경 알림, 그 밖에는 '배정 알림 발송됨'+신규 배정 알림. 값이 그대로면 아무것도 하지 않는다 |
| `updateTask(id, patch)` | 바뀐 필드만 반영. 등록·배정됨·작업전 작업은 배정 필드에 따라 상태를 다시 정한다(모두 채워지면 `PENDING_ACCEPT`, 배정 중인데 비면 `REGISTERED`+'배정 해제'). 그 밖에는 '작업 정보 수정'. 취소된 작업은 바꾸지 않는다 |
| `cancelTask(id, reason, detail)` | `CANCELED`, `cancellation`(사유·상세·시각·처리자) 기록, 이력 '작업 취소', 작업 취소 알림. 취소 작업은 목록·보드·타임테이블 셀렉터에서 빠진다 |
| `requestReport(id)` | `reportRequestedAt` 기록, 이력 '완료 보고 요청' |
| `loginWithKakao()` | 첫 사용자(`session.isNewUser`, `?user=new`)면 `{ needsOnboarding: true }`이고 로그인 상태는 그대로. 약관 모달은 `session.termsAgreed`가 false일 때 띄운다. 기존 사용자는 `loggedIn: true` |
| `agreeTerms(m)` / `registerProfile` / `createCompany` / `finishOnboarding` | 약관 동의 / 현재 사용자 이름·연락처 / 현재 발주사 이름·업종(소속 목록 이름도 함께) / `isNewUser: false`, `loggedIn: true` |
| `logout()` / `withdrawAccount(reason)` | `loggedIn: false`(앱 화면은 `/login`으로 돌아간다) |
| `switchCompany(id)` | `currentCompanyId` 변경. 인력·작업 데이터는 그대로 두고, 선택한 발주사의 소속 역할에 맞춰 로그인 사용자의 총관리자 여부를 바꾼다(직원이면 박서준이 총관리자) |
| `updateProfile` / `updateCompany` | 현재 사용자 / 현재 발주사(소속 목록 이름 포함) 수정 |
| `issueJoinCode()` / `regenerateJoinCode()` | 코드가 없을 때만 발급 / 항상 새 코드. 형식 `ORBIT-XXXX`, 링크 `https://orbit.app/join/<코드>` |
| `changeMemberKind(id, kind, typeId)` | 구분·유형 변경. 기사 → 직원이면 그 기사의 배정됨·작업전 작업을 `REGISTERED`(기사 해제, 이력 '배정 해제')로 돌린다. 작업중 작업이 있으면 화면에서 막는다(`useTechnicianOpenTasks`) |
| `setMemberType` / `setMemberStatus` | 유형 / 활성 상태 변경. 비활성 기사는 `useActiveTechnicians`(배정·타임테이블 대상)에서 빠진다 |
| `assignOwner(id)` / `releaseOwner(id)` | 직원만 지정 가능, 기존 총관리자는 해제 / 해제. 로그인 사용자의 소속 역할(사이드바 '총 관리자')도 함께 바뀐다. '최소 1명 유지' 안내는 화면이 보여 주고, 액션은 막지 않는다 |
| `setJoinRequestKind` / `approveJoinRequests` / `rejectJoinRequests` | 확정 유형 변경 / 확정 유형으로 인력 생성(활성, 참여일 지금, 유형 없음) 후 요청 제거 / 요청 제거 |
| `addType(category, name, color?)` | 새 활성 유형. 작업 유형은 색을 안 주면 아직 안 쓴 색을 `TYPE_COLOR_ORDER` 순서로 고른다. 직원·기사 유형 색은 `null` |
| `updateType` / `setTypeActive` | 이름·색(작업 유형만) / 활성화·비활성화 |
| `deleteType(id)` | 목록에서 지우고, 그 유형의 인력은 유형 없음(`null`), 작업은 작업중·완료를 빼고 유형 없음. 작업중·완료 작업은 유형을 유지하며 `selectTypeById`·`useType`이 삭제된 유형도 찾아 준다(Figma 주석 1924:15794) |
| `markNotificationRead` / `markAllNotificationsRead` / `deleteNotification` | 읽음 / 모두 읽음 / 삭제 |
| `setNetwork('online' \| 'offline')` | 네트워크 실패 화면 전환. '다시 시도'는 `setNetwork('online')` |

알림은 사무실 쪽 사건에서만 만든다: 배정(신규 배정), 배정된 작업의 시간 변경(일정 변경), 작업 취소. 새 알림은 안 읽음이다. 수락·거절·완료 보고 알림은 기사 앱 사건이라 시드에만 있다.

## 3. 시나리오 쿼리

| 쿼리 | 초기 상태 |
| --- | --- |
| `?role=staff` | 로그인 사용자 `isOwner: false`, 소속 역할 `STAFF`, 유형 배차 담당. 박서준이 총관리자(유형 관리자) |
| `?data=empty` | 작업·알림·승인대기·유형 없음. 인력은 로그인 사용자만(기사 0명). `role=staff`와 함께면 총관리자 박서준도 있다. 회사 코드·링크 `null` |
| `?network=offline` | `network: 'offline'` |
| `?companies=2` | 발주사·소속 2곳: OO건설(역할은 role 기준), 협력 발주사(직원, 업종 종합 시설관리, 코드 미발급) |
| `?user=new` | 로그아웃 상태, `isNewUser: true`, `termsAgreed: false`. 데이터는 기본 시드(빈 회사로 시작하려면 `&data=empty`) |
| `?reset=1` | 저장된 시나리오를 지우고 기본값에서 시작(같은 URL의 다른 쿼리는 그 뒤에 적용) |
| `?time=HH:mm` | 시연 시각. 앱의 현재 시각을 오늘 그 시각(Asia/Seoul)으로 옮긴다(시간은 계속 흐름). 시드의 '오늘' 사건·상대 시각·보고 미제출 판단·현재 시각선이 모두 따른다. sessionStorage `orbit:time`에 남고 `?reset=1`·`?time=real`로 실제 시각으로 돌아간다. 시나리오 계약(`Scenario`) 밖에서 `src/lib/date.ts`의 `clockNow()`가 처리한다 |

- 앱 시작 때 한 번 읽어 sessionStorage `orbit:scenario`에 병합·저장한다. 같은 탭에서는 쿼리 없이 새로고침해도 유지된다. 기본값으로 돌아가려면 `?reset=1`.
- 잘못된 값은 무시한다. 시나리오는 시작 상태만 정하고, 데이터 변경은 메모리에만 있어 새로고침하면 시드로 돌아간다(로그인·네트워크 상태 포함).
- 시나리오 쿼리 외의 쿼리(예: `?mode=edit&task=<id>`)는 각 섹션이 읽는다.

## 4. 시드

실제 오늘 날짜(Asia/Seoul)를 기준으로 매번 만든다. 날짜는 '오늘 기준 일수'로 적는다. 오늘에 일어난 사건(알림·수락·시작 등)은 현재 시각을 넘지 않게 당겨진다.

### 발주사·유형·인력

- 발주사 `c-1` 'OO건설', 업종 '냉난방 설비', 코드 `ORBIT-7K2M`, 링크 `https://orbit.app/join/ORBIT-7K2M`
- 유형(`SEED_TYPE_IDS`, 괄호는 비활성)
  - 직원: 관리자, 배차 담당, 사무 지원, (현장 담당)
  - 기사: 전문 기사, 설치 기사, A/S 기사, 전기 기사, (보조 기사)
  - 작업: 설치 `PURPLE`, 점검 `BLUE`, 수리 `YELLOW`, (세척 `GREEN`)

| 구분 | 인력(`SEED_MEMBER_IDS`) |
| --- | --- |
| 직원 | 오르빗 `m-me`(관리자, 총관리자, 010-1234-5678), 김운영(배차 담당), 박서준(배차 담당), 이지은(사무 지원), 송지환(배차 담당), 양서희(사무 지원) |
| 기사 | 김민수(전문 기사), 김민준(설치 기사), 이민준(A/S 기사), 홍길동(설치 기사), 김태훈(전기 기사), 박서연(설치 기사), 이철호(설치 기사), 이준혁(전기 기사) |
| 비활성 | 최동욱(A/S 기사) — 타임테이블 행·배정 대상에서 빠진다 |

### 작업 52건

| 날짜 | 구성 |
| --- | --- |
| 오늘 | 18건: 완료 4, 작업중 4(지연 1), 작업전 4, 배정됨 6. 기사 8명, 09:00–18:00 |
| 어제 | 7건: 완료 6, 작업중 1(종료 지남·보고 없음) |
| 내일 | 5건: 작업전 3, 배정됨 2 (+ 취소 1건 숨김) |
| 모레 | 작업전 1건 |
| 지난 완료 | 9건(2–30일 전, 기사 작업이력용, 그중 박서연 기사 4건) |
| 등록(대기함) | 10건: 기사·시간 미지정 7(그중 거절 3), 기사만 있음 2, 날짜·시각만 있음 1, 등록 1–5일 전 |
| 취소 | 2건(목록·보드·타임테이블에서 숨김) |

등록자는 김운영 35건, 박서준 12건, 오르빗 5건이다. 고객은 서울 주소·010 연락처, 금액·결제 방식(현장 결제·계좌 이체·카드 결제)이 있다. 취소를 뺀 작업은 50건(페이지당 5건이면 10쪽)이다.

오늘 격자

| 기사 | 작업 |
| --- | --- |
| 김민수 | 09:00–10:30 인덕션 설치 완료 · 13:00–15:00 에어컨 실외기 점검 및 세척 배정됨 · 16:00–17:00 가스레인지 점검 배정됨 |
| 김민준 | 09:00–11:00 시스템 에어컨 설치 완료 · 15:00–17:00 배관 누수 점검 및 교체 배정됨 |
| 이민준 | 10:00–12:00 보일러 배관 교체 작업중 · 15:00–16:30 냉장고 수리 작업전 |
| 홍길동 | 09:00–10:00 정수기 설치 완료 · 11:00–12:00 욕실 환풍기 교체 작업중 · 16:00–17:00 에어컨 점검 배정됨 |
| 김태훈 | 14:00–15:30 조명 교체 작업전 |
| 박서연 | 09:30–11:00 건조기 설치 완료 · 14:00–16:00 보일러 수리 배정됨(오늘 일정 변경, 재수락 대기) |
| 이철호 | 09:00–11:00 식기세척기 설치 작업중+지연 · 13:00–15:00 세탁기 설치 작업전 · 16:00–18:00 에어컨 이전 설치 배정됨 |
| 이준혁 | 10:00–13:00 서초 상가 전기 공사 작업중 · 15:00–16:30 콘센트 증설 작업전 |

### 시연용 고정 ID ↔ Figma 프레임

`DEMO_TASK_IDS`(`src/mocks/constants.ts`)로 가져온다. 상세 모달은 `/tasks/<id>`, `/board/<id>`(오늘 작업)로 연다.

| ID | 작업·상태 | Figma |
| --- | --- | --- |
| `t-demo-pending` | 배관 누수 점검 및 교체, 김민준, 오늘 15:00, 배정됨 | 작업 상세 미수락 `785:5490` |
| `task-06` | 에어컨 실외기 점검 및 세척, 김민수, 오늘 13:00, 배정됨 | 진행 보드 작업 상세 `1892:12847`, 보드 취소 모달 `2490:13502` |
| `t-demo-accepted` | 냉장고 수리, 이민준, 오늘 15:00, 작업전 | 작업 상세 수락됨 `785:5923`, 알림 상세 작업 배정됨(수락됨·이민준) `1834:5562` ← 알림 `n-04` |
| `t-demo-in-progress` | 보일러 배관 교체, 이민준, 오늘 10:00, 작업중 | 작업중 `785:4522` |
| `t-demo-delayed` | 식기세척기 설치, 이철호, 오늘 09:00, 작업중+지연 | 작업중/지연 `785:6353` |
| `t-demo-completed` | 시스템 에어컨 설치, 김민준, 오늘 09:00, 완료(보고·사진 2장·첨부 6장) | 작업완료 `785:4191`, 첨부파일 탭 `785:7238` |
| `t-demo-no-report` | 세탁기 배수 펌프 수리, 이민준, 어제 14:00–16:00, 작업중·보고 없음 | 보고 미제출 `785:4984`('기사에게 요청 보내기') |
| `t-demo-rejected` | 세탁기 점검, 등록+거절(김태훈, 사유 '일정 중복') | 작업 목록 대기함 잔여·거절 행 `450:2651`, 알림 `n-05` |
| `t-demo-conflict` | 세탁기 설치, 이철호, 오늘 13:00–15:00, 작업전 | 배정 확인 `1325:8954`(이철호·13:00·2시간), 일정 충돌 경고 `1325:10373` |
| `t-demo-stale` | 인덕션 교체, 설치, 등록 3일 경과, 기사 미정 | 대기함 카드 `443:1156`. '변경된 정보입니다' `1325:11695`를 재현할 결정적 트리거 후보(사용 여부는 timetable 담당이 정해 보고) |

그 밖의 시연 데이터

| 데이터 | Figma |
| --- | --- |
| `task-42` 정수기 필터 교체 — 취소(고객 요청), 담당 기사 미정 ← 알림 `n-03` | 알림 상세 작업 취소됨 `1807:6719`, 취소 안내 패널 `1894:8798` |
| 이준혁 — 작업중 '서초 상가 전기 공사' | 역할 변경 불가 `2008:31376` |
| 김태훈 — 예정 작업 1건 '조명 교체'(작업중 없음) | 역할 변경 '예정된 작업 1건' `2008:31713` |
| 박서연 — 완료 6건, 거절 1건(주방 수전 교체, 이후 홍길동이 완료) | 기사 작업이력 `1550:8288` |
| 최동욱 — 비활성 기사 | 기사 활성화 모달 `2008:32588` |
| 승인대기 7건 | 승인대기 모달 `1951:20261`, `1888:10087`, `1951:21047` |

### 알림 12건(안 읽음 2)

| 묶음 | 알림 |
| --- | --- |
| 오늘 | 신규 배정 '홍길동 기사님께 [에어컨 점검] 작업이 배정되었습니다.'(안 읽음), 일정 변경 '[보일러 수리] 작업 일정이 오후 2시로 변경되었습니다.'(안 읽음), 작업 취소 '[정수기 필터 교체] 작업이 취소되었습니다.', 수락 완료 '이민준 기사님이 [냉장고 수리] 작업을 수락했습니다.' |
| 어제 | 작업 거절(김태훈, 세탁기 점검, 일정 중복), 완료 보고 '박서연 기사님이 [에어컨 설치] 작업의 완료 보고를 제출했습니다.', 수락 완료(김민준, 빌트인 오븐 설치) |
| 2일 전 | 완료 보고(김민수, 배관 설치), 작업 거절(홍길동, 에어컨 배관 청소, 부품 수급 지연), 신규 배정(이철호, 세탁기 설치) |
| 3일 전 | 작업 거절(이철호, 가스보일러 점검, 이동 거리 초과), 완료 보고(이준혁, 전기 콘센트 교체) |

모든 알림은 `taskId`로 작업과 연결되고, 알림 시각은 그 작업 이력의 같은 사건 시각과 같다. ID는 `n-01`(최신)–`n-12`.

### 승인대기 7건

정하늘(기사), 오세훈(희망 기사 → 확정 직원, 불일치), 한지우(직원), 윤도현(기사), 서민재(희망 직원 → 확정 기사, 불일치), 장예린(기사), 임채원(직원). 요청 경로는 회사 코드·참여 링크·QR 코드가 섞여 있고 요청일은 1–6일 전이다.

## 5. 정의와 규칙

- **작업 상태**: 기사·날짜·시작 시각·소요 시간이 모두 있어야 배정 상태다(`hasFullAssignment`). 등록은 대기함, 배정됨·작업전·작업중·완료는 격자·보드(`isScheduledStatus`). 거절은 `status: 'REGISTERED'` + `rejection`(기사·시간은 비워진다), 지연은 `delayed: true` 배지다. 표기는 `TASK_STATUS_LABEL`.
- **진행 보드 집계**(`getBoardSummary`/`useBoardSummary`): 그 날짜의 배정됨·작업전·작업중·완료 작업(등록·취소 제외)이 대상이다. 총 작업 = 진행중 + 지연 + 완료. 진행중 = 배정됨·작업전·작업중 중 지연이 아닌 작업, 지연 = 완료 전 지연 작업, 완료 = 완료 작업. 탭 개수는 `byStatus`(전체 = `total`).
- **보고 미제출**(`isReportOverdue`): 작업중인데 종료 예정 시각이 지났고 보고가 없다. 작업 상세의 '종료 예정 시각이 지났는데 보고가 없어요' 기준이다.
- **대기함 미처리 사유**(`getUnassignedReason`): '담당기사 · 시간 미지정', '담당기사 미지정', '시간 미지정'.
- **이력 문구**(`HISTORY_LABEL`): 작업 등록됨, 배정 알림 발송됨, 기사 수락, 기사 거절, 작업 시작, 완료 보고 제출, 작업 취소, 일정 변경, 배정 해제, 작업 정보 수정, 완료 보고 요청. 처리자는 직원이면 이름, 기사면 '이름 기사'. 이력은 오래된 순이다.
- **완료 보고**: `report.content`는 `작업 메모\n\n[사용 부품]\n부품` 형식이고 `splitReportContent`로 나눈다. `report.photoUrls[0]`은 작업 전 사진, `[1]`은 작업 후 사진이다.
- **사진**: 시드 사진은 `mockPhotoUrl(n)`(회색 바탕 SVG data URI)이다. 첨부 파일 탭은 `attachments`(등록 때 현장 사진과 같은 목록, 최대 6장)를 쓴다.
- **유형 삭제**: 인력은 유형 없음, 작업은 작업중·완료를 빼고 유형 없음. 인력·작업의 `updatedAt`·이력은 바꾸지 않는다.
- **총관리자**: `Member.isOwner`(직원만, 회사당 1명)와 현재 발주사 `CompanyMembership.role`이 함께 움직인다. 사이드바·마이페이지 역할은 `selectCurrentMembership`/`selectIsOwner`, 인력 목록 왕관은 `isOwner`를 쓴다.
- **정렬**: 작업 목록 최근 수정 순, 대기함 등록 오래된 순, 날짜별 작업 시작 시각 순, 알림·승인대기 최신순, 인력 총관리자 → 직원 → 기사(참여일 순), 유형 만든 순.

## 6. 셀렉터·훅(`src/mocks/selectors.ts`)

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
| `clockNow()` | 앱의 현재 시각(epoch ms). `?time=HH:mm`이 있으면 그 시각, 없으면 `Date.now()`. 현재 시각 기본값은 모두 이 함수를 쓴다 |
| `today()`, `nowIso()`, `addDays`, `diffDays`, `weekdayLabel`, `isToday` | 날짜 계산 |
| `hmToMinutes`, `minutesToHm`, `addMinutesToHm`, `nowMinutes` | 'HH:mm' ↔ 분, 현재 시각(분, 타임테이블 현재 시각선) |
| `combineDateTime`, `toIsoDate`, `toHourMinute`, `toKstParts`, `startOfMonth`, `isSameMonth` | 일시 변환 |

## 8. 라우트 가드

`src/app/router.tsx`에서 앱 레이아웃 라우트(`/timetable`·`/tasks`·`/board`·`/org`·`/notifications`·`/mypage`)를 `RequireAuth`로 감싼다. 로그아웃 상태로 앱 경로에 들어오면 `/login`으로 바꿔 보내고 원래 경로를 `location.state.from`에 담는다(로그인 후 그 경로로 간다). 앱 화면을 보던 중 로그아웃·탈퇴하면 담지 않아 다시 로그인하면 `/timetable`로 간다. `/`, `/login`, `/onboarding/*`는 공개다. 섹션 라우트는 lazy로 불러온다.
