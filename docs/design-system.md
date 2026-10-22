# 디자인 시스템(src/design-system)

Figma `DesignSystem 웹` 페이지(`0:1`)의 컴포넌트와 웹 화면에서 반복되는 패턴을 공통 컴포넌트로 옮긴 목록입니다. 섹션 화면은 이 문서에 있는 컴포넌트를 먼저 쓰고, 없는 것만 자기 폴더에 지역 컴포넌트로 만듭니다(최종 보고에 "DS 보완 필요"로 남김).

- 가져오기: `import { Button, Dialog, Icon } from '@/design-system';`
- 값의 근거: Figma `use_figma` 노드 스타일 덤프와 `get_design_context`(사이드바 `1921:10813`). 기준 스크린샷은 `.figma/ref/ds/<nodeId>.png`, 원본 SVG는 `.figma/ref/ds/svg-raw/`, 아이콘 메타는 `.figma/ref/ds/icon-meta.json`.
- 모든 크기·여백은 1920px 캔버스 px 그대로입니다. 화면에서 위치를 잡을 때도 Figma 좌표를 그대로 씁니다.
- Figma에 없는 호버·포커스 모양은 넣지 않았습니다. 예외: 키보드 포커스 표시(`:focus-visible`)와, 드롭다운 항목 호버를 Figma의 선택 모양(Gray50 배경)과 같게 둔 것.

## 1. 토큰과 글자

### 색

`src/styles/tokens.css`의 `var(--color-*)`만 씁니다. Figma 변수 이름을 kebab-case로 바꾼 이름입니다(`Gray200` → `--color-gray-200`, `InProgress/4` → `--color-in-progress-4`, `Support/select2` → `--color-support-select-2`).

변수가 아닌 고정값은 아래 토큰으로 모았습니다.

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `--color-dim` | `rgba(0,0,0,0.4)` | 모달 배경(Modal) |
| `--shadow-dropdown` | `0 0 8.2px 0 rgba(0,0,0,0.17)` | 드롭다운·더보기 메뉴(Menu) |
| `--shadow-popover` | `0 0 12px 0 rgba(0,0,0,0.08)` | 발주사 전환 팝오버, 기사 0명 카드 |

토큰이 없는 Figma 값은 컴포넌트 CSS에 그대로 적었습니다: 페이지네이션 현재 페이지 `#e0e0ee`, ▼ 캐럿 `#727272`, 검색 플레이스홀더 `#b5b5b5`, 마이페이지 아바타 배경 `#e2e2f0`·아이콘 `#56569d`, 활성화 칩 배경 `#4f3bfe` 12%, 사이드바 메뉴 글자 `#f1f1f1`, 사이드바 구분선 흰색 12%.

### 글자

- 글꼴은 Pretendard입니다. 화면 글자는 세로 지표만 바꾼 `'Orbit Pretendard'`(`src/styles/fonts.css`, ascent 94.2%·descent 20.65%)를 씁니다. Chrome이 원래 지표를 정수로 반올림하면 12·15·16·24·32·36·48px 글자가 정수 줄 높이 상자 안에서 Figma보다 1px 위에 그려지는데, 이 값에서는 앱이 쓰는 모든 글자 크기·줄 높이 조합에서 Figma와 같은 기준선이 나옵니다. 입력 상자(input·textarea·select)는 원래 지표로 Figma와 같아 `--font-family-control`(원래 `'Pretendard'`)을 씁니다.
- 자간 -2.5%(`--letter-spacing-base`, -0.025em)는 `global.css`가 **모든 요소**에 지정합니다. em 자간은 선언한 요소의 글자 크기로 계산된 px 값이 상속되므로(body 16px → -0.4px) 요소마다 다시 지정해야 Figma처럼 각자 글자 크기의 -2.5%가 됩니다. Figma 자간 0인 글자(작업 유형 배지, 카카오 로그인, 로그인 도움말 상자, 온보딩 미리보기 카드, 타임테이블 보기/편집 토글·편집 안내 칩)는 그 요소에서 0으로 덮습니다.
- `src/styles/typography.css`의 `t-*` 클래스(Figma 텍스트 스타일 이름)를 씁니다. 예: `Body/S/Medium` → `t-body-s-medium`.
- **줄 높이는 140%를 정수 px로 반올림한 값**입니다. Figma 텍스트 상자 높이가 이 값이어서, 소수 px(1.4)를 쓰면 여러 줄이 쌓일 때 1px씩 밀립니다. CSS Module에서 글자 크기를 직접 쓸 때는 줄 높이 토큰을 같이 씁니다.

| font-size | 12 | 13 | 14 | 15 | 16 | 18 | 20 | 22 | 24 | 28 | 32 | 36 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| line-height 토큰 | `--line-height-12`(17) | `-13`(18) | `-14`(20) | `-15`(21) | `-16`(22) | `-18`(25) | `-20`(28) | `-22`(31) | `-24`(34) | `-28`(39) | `-32`(45) | `-36`(50) |

Figma에서 line-height가 `auto`인 글자(작업 유형 배지 15px, 대기함 카드 작업명 20/600·경과 13px)는 원래 Pretendard 지표의 normal 높이를 px로 적습니다(18·24·15px). 바꾼 지표에서는 normal 높이가 1px 줄기 때문입니다.

## 2. 포털과 좌표

- 모달·드롭다운은 모두 `#overlay-root`(AppStage 캔버스 안)로 포털합니다. `Modal`·`Popover`가 처리하므로 화면에서 `createPortal`을 직접 쓰지 않아도 됩니다.
- `Popover`는 AppStage의 `zoom`을 계산해 트리거 아래·위에 붙입니다. 스크롤·창 크기 변경 때 다시 계산하고, 바깥 클릭·Esc로 닫힙니다. Esc는 캡처 단계에서 처리하므로 모달 안의 드롭다운을 닫을 때 모달까지 닫히지 않습니다.
- 첫 렌더에서 바로 열린 모달(예: `/tasks/:taskId` 직접 진입)도 그려집니다(`useOverlayRoot`).

## 3. 컴포넌트 한눈에 보기

| 컴포넌트 | 용도 | Figma |
| --- | --- | --- |
| `Icon` | 아이콘 66종(§6) | `Icon` 456:4223 + 화면 아이콘 |
| `Logo` | Orbit 로고(마크·워드마크) | `Side bar` 456:4284, 로그인 2423:12794 |
| `Button` | 버튼 7종 × md/lg | `Button` 449:2601 + 화면 버튼 |
| `IconButton` | 아이콘만 있는 버튼 | 모달 닫기, 더보기, 대기함 접기 |
| `SelectButton` | 필터 버튼(라벨 + ⌄) | `Select` 449:2597 |
| `FilterSelect` | 필터 버튼 + 옵션 패널(단일·다중) | 작업 목록 필터 1883:14092 |
| `Menu` / `MenuItem` | 드롭다운 패널·항목 | `직원 유형` Drop Down=o, 더보기 2008:27440 |
| `Popover` | 트리거에 붙는 포털 패널 | — |
| `CompactSelect` | 표 안 작은 드롭다운(직원/기사) | `직원 유형` 1377:7883 |
| `Field` | 라벨 + 입력 묶음 | 화면별 라벨 |
| `TextField` | 텍스트 입력 5가지 모양 | 새 작업 등록·모달·마이페이지·발주사 정보·온보딩 |
| `SelectField` | 폼 선택 상자(▼) + 옵션 | 배정 확인·작업 취소·총관리자 지정·새 작업 등록·업종 |
| `TextArea` | 여러 줄 입력 | 승인 거절 사유 1951:23292 |
| `SearchInput` | 이름 검색 | 인력관리 1951:19170 |
| `Checkbox` | 24px 체크박스 | mingcute:checkbox-fill, octicon:checkbox-16 |
| `UnderlineTabs` | 밑줄 탭(+건수) | `Tab Bar` 878:4101/878:4344 |
| `PillTabs` | 알약형 탭(+건수) | `Tab / Type` 1892:12204, 인력관리 건수 필터 |
| `FilterChips` | 전체·안 읽음 필터 | 알림창 2053:9745 |
| `Pagination` | 요약 + 페이지 번호 | 작업 목록 460:4679 |
| `Chip` | 상태 칩 기본형 | 작업상태 컬러칩·Component 15 |
| `StatusChip` | 작업 상태 칩(새 표기) | 2293:11954, 2423:12709, 타임테이블 블록 |
| `MemberStatusChip` | 활성화·비활성화 | `Component 15` 570:2977 |
| `WorkTypeBadge` | 작업 유형 배지 | `Work Type Badge` 449:2580 |
| `Avatar` | 원형 아바타 4종 | 사이드바·팝오버·마이페이지 |
| `StateMessage` | 빈·오류 상태 3종 | 1338:6564, 2053:9689, 1773:7704, 1834:10132 |
| `Modal` | 어두운 배경 + 가운데 배치 | 모든 모달 |
| `Dialog` | 확인형 모달 셸 | 배정 확인·일정 충돌·변경정보·작업 취소·유형 삭제·약관 동의 등 |
| `ModalPanel` | 큰 모달(머리말 + 회색 본문) | 새 작업 등록 1282:7973 |
| `InfoBox` | 회색 안내 상자 | 유형 삭제 확인 1951:24074 |
| `Sidebar` | 앱 사이드바 | `SIde bar` 536:2553, 2곳 이상 1921:10813 |
| `DriverListItem` | 타임테이블 기사 칸 | `Driver List Item` 449:2562 / 443:1277 |
| `WorkCard` | 대기함 카드 | 443:1197 (`Work Card` 449:2567 화면판) |
| `ScheduleCard` | 타임테이블 일정 블록 | 443:1651·443:1662·443:1661 (`Schedule Card` 449:2610 화면판) |

## 4. 컴포넌트 상세

### Icon

```tsx
<Icon name="search" size={28} color="var(--color-gray-600)" />
<Icon name="users" size={42} color="var(--color-gray-500)" />   // Figma Icon / Type=인력
<Icon name="wifi-off-circle" />                                   // 다색, 68px
```

| prop | 타입 | 기본 | 설명 |
| --- | --- | --- | --- |
| `name` | `IconName` | — | §6 표의 이름 |
| `size` | `number` | 원래 크기 | 가로 px. 세로는 원본 비율(crown 20×16, caret-down 13×8, chevron-down-sm 8×5) |
| `color` | `string` | `currentColor` | 단색 아이콘 색. 다색 아이콘에는 무시 |
| `title` | `string` | — | 접근성 이름. 없으면 `aria-hidden` |

- SVG는 Figma에서 노드 단위로 내보낸 그대로(viewBox·도형 동일)이고, 단색 아이콘만 fill/stroke 색을 `currentColor`로 바꿨습니다. 그래서 **색은 화면에서 지정**해야 Figma와 같아집니다. §6 표의 "Figma 색"은 DS 원본 색이고, 화면별 색은 인스턴스마다 다릅니다(예: 사이드바 메뉴 `#f4f4f4`, 셀렉트 ⌄ `#222222`).
- 크기를 바꿀 때는 루트 width/height만 바꿉니다. 같은 아이콘을 여러 번 그려도 clipPath id가 겹치지 않습니다.

### Logo

```tsx
<Logo variant="lockup" color="var(--color-gray-0)" />                        // 사이드바(125×32)
<Logo variant="lockup" color="var(--color-primary)" style={{ opacity: 0.8 }} /> // 로그인 왼쪽 위(2423:12768, 불투명 80%)
<Logo variant="hero" color="var(--color-primary)" />                         // 로그인 큰 'Orbit'(323×94)
```

| variant | 크기 | 내용 |
| --- | --- | --- |
| `lockup`(기본) | 125×32 | 마크(28, radius 8, y=2) + 'Orbit' 워드마크(x=38) |
| `wordmark` | 84×25 | 'Orbit' 글자 외곽만(32px) |
| `hero` | 323×94 | 로그인 화면 'Orbit'(KIMM_Bold 123.6px, 가운데 정렬 400×124 상자 안) |
| `mark` | 28×28 | 둥근 사각형 마크 |

- `height`로 비율 유지 확대·축소, `color` 기본 `currentColor`. KIMM_Bold 글꼴은 쓰지 않고 외곽선 SVG만 씁니다.
- 로그인 `Frame 2`의 'Orbit'은 Figma 레이어 글꼴이 Gmarket Sans로 표시되지만 내보낸 외곽선이 사이드바 워드마크와 같아 `lockup`을 그대로 씁니다.
- `Logo 시안` 프레임(1699:8636·1699:8641·2293:9796)은 어느 화면에도 쓰이지 않아 넣지 않았습니다.

### Button

```tsx
<Button>저장</Button>
<Button icon="plus">새 작업 등록</Button>                               // Icon-Filled(아이콘 28, 간격 8)
<Button variant="outline">작업내역 출력</Button>                         // Text-Stoke
<Button variant="outline" icon="search" style={{ borderRadius: 8 }}>주소 검색</Button>
<Button variant="outline" icon="qr-code" iconSize={24}>회사 코드 관리</Button>
<Button icon="mail" iconSize={24} dot>승인대기 1</Button>                // 빨간 점
<Button variant="secondary" style={{ width: 97 }}>취소</Button>          // 모달 버튼은 Figma 고정 너비를 style로
<Button variant="danger" style={{ width: 120 }}>탈퇴</Button>
<Button variant="danger-soft" disabled style={{ width: 120 }}>작업 취소</Button>
<Button variant="accent" fullWidth>동의하고 계속하기</Button>
<Button variant="ghost" style={{ width: 97 }}>닫기</Button>
<Button size="lg" disabled style={{ width: 173 }}>저장</Button>         // 발주사 정보·새 작업 등록 하단
<Button size="lg" variant="secondary" style={{ width: 97 }}>취소</Button>
```

| prop | 값 | 설명 |
| --- | --- | --- |
| `variant` | `primary`(기본) · `outline` · `secondary` · `danger` · `danger-soft` · `accent` · `ghost` | 아래 표 |
| `size` | `md`(기본) · `lg` | md: 높이 50, padding 10/16, 18/500 · lg: 높이 60, padding 16/31, 20/500 |
| `icon` / `iconSize` | `IconName` / `24 \| 28`(기본 28) | 28이면 간격 8, 24면 간격 10 |
| `dot` | `boolean` | 오른쪽 위 13px 빨간 점(흰 테두리 2px), 승인대기 |
| `fullWidth` | `boolean` | 너비 100% |
| 나머지 | `button` 속성 | `disabled`이면 불투명 50%(Figma 비활성 시안) |

| variant | 모양 | Figma |
| --- | --- | --- |
| `primary` | Primary 배경, 흰 글자 | Text-Filled · Icon-Filled |
| `outline` | Primary 1px 테두리(레이아웃 포함), Primary 글자 | Text-Stoke · Icon-Stroke |
| `secondary` | Gray300 1px 테두리, Gray900 글자 / lg는 바깥 테두리 + Gray800 | Text-Secondary, 모달 '취소' |
| `danger` | Warning/1 배경, 흰 글자 | 계정 탈퇴 확인 '탈퇴' |
| `danger-soft` | Warning/2 배경, Warning/1 글자 | 유형 삭제 '삭제', 작업 취소 '작업 취소' |
| `accent` | Secondary 배경, 흰 글자 | 약관 동의 '동의하고 계속하기' |
| `ghost` | 배경·테두리 없음, Gray900 글자 | 작업 취소 모달 '닫기' |

radius는 12입니다. 화면에서 다른 값(주소 검색 8)은 `style`로 덮습니다. 마이페이지 '사진 업로드'처럼 테두리 색이 다른 경우(Gray200 + 흰 배경 + Primary 글자)는 `variant="outline"`에 className으로 테두리 색만 바꿉니다.

### IconButton

```tsx
<IconButton icon="close" size={28} color="var(--color-gray-600)" label="닫기" onClick={onClose} />
<IconButton icon="more-vertical" color="var(--color-gray-500)" label="더보기" />
```

배경 없는 버튼입니다. `label`은 필수(aria-label). 시안에 없는 브라우저 툴팁(title)은 띄우지 않습니다.

### SelectButton · FilterSelect

```tsx
<SelectButton label="일반 기사" onClick={...} />   // Figma Select 449:2597

<FilterSelect
  label="등록자"
  value={registrant}            // string | null
  onChange={setRegistrant}      // 같은 값을 다시 누르면 null
  options={[{ value: 'm-1', label: '김운영' }]}
/>
<FilterSelect multiple label="상태" value={statuses} onChange={setStatuses} options={statusOptions} />
```

- SelectButton: 높이 50, padding 10/16, radius 12, Gray200 테두리, 18/500 Primary, `chevron-down` 28(#222). 너비는 글자에 맞춰집니다(상태 103, 담당기사 133). 열림 모양 차이는 Figma에 없습니다.
- FilterSelect 패널: 트리거 아래 6px, 트리거와 같은 너비(`matchWidth` 기본 true), Menu 모양. 단일 선택은 고르면 닫히고 `multiple`은 열린 채 토글합니다. 선택지가 없으면(기사·유형이 없는 발주사의 담당기사·유형 등) 패널을 열지 않습니다(빈 메뉴 상자는 시안에 없음).

### Menu · MenuItem · Popover

```tsx
const anchorRef = useRef<HTMLButtonElement>(null);
<IconButton ref={anchorRef} icon="more-vertical" label="더보기" onClick={() => setOpen(true)} />
<Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} placement="bottom-end">
  <Menu style={{ width: 156 }}>
    <MenuItem tone="action" icon="ban" iconColor="var(--color-gray-800)">비활성화</MenuItem>
    <MenuItem tone="danger" icon="trash">삭제</MenuItem>
  </Menu>
</Popover>
```

| | 값 |
| --- | --- |
| Menu | 흰 배경, radius 10, padding 6, 항목 간격 2, `--shadow-dropdown` |
| MenuItem | 높이 48, radius 6, 글자 왼쪽 12, 18/500. 아이콘 24 + 간격 8 |
| `tone="option"`(기본) | Gray600 글자. `selected`·호버: Gray50 배경 + Gray800 글자 |
| `tone="action"` | Gray800 글자, 호버 Gray50 |
| `tone="danger"` | Warning/1 글자(아이콘도 같은 색), 호버 Gray50 — Figma 더보기의 '삭제' |

Popover props: `open`, `anchorRef`, `onClose`, `placement`(`bottom-start` 기본 · `bottom-end` · `top-start` · `top-end`), `offset`(기본 6), `matchWidth`.

### CompactSelect

```tsx
<CompactSelect
  aria-label="직원 유형"
  value={member.kind}
  options={[{ value: 'EMPLOYEE', label: '직원' }, { value: 'TECHNICIAN', label: '기사' }]}
  onChange={(kind) => openRoleChangeDialog(kind)}
  readOnly={member.isOwner}
/>
```

- 트리거 118×41(`width`로 변경), padding 7/12, radius 10, Gray200 테두리(열리면 Secondary), 18/500 Gray800, `chevron-down-sm` 8×5. `readOnly`: Gray500 글자·셰브론, 열리지 않음.
- 패널은 트리거 너비, 트리거 아래 17px(`menuOffset`) — 인력관리 표에서 패널이 행 아래 경계에 붙는 Figma 배치입니다. 다른 곳에서는 값을 바꿔 씁니다.
- 값을 고르면 `onChange`만 부릅니다. 역할 변경 확인 모달은 화면에서 띄웁니다.

### Field

```tsx
<Field label="작업명"><TextField placeholder="예) 배관 누수 점검 및 교체" /></Field>
<Field label="담당기사" labelStyle="modal"><SelectField ... /></Field>
<Field label="거절 사유" labelSuffix="(선택)" labelStyle="title"><TextArea /></Field>
<Field label="이름" hint="필수 항목" labelStyle="caption"><TextField appearance="filled" /></Field>
```

| labelStyle | 라벨 | 간격 | 화면 |
| --- | --- | --- | --- |
| `default` | 16/500 Gray800 | 8 | 새 작업 등록 |
| `modal` | 18/500 Gray900 | 8 | 모달 필드 |
| `title` | 20/500 Gray900 | 12 | 승인 거절 사유 |
| `profile` | 20/500 Gray700 | 8 | 마이페이지 |
| `large` | 20/500 Gray900 80% | 8 | 발주사 정보 |
| `caption` | 14/500 Gray600 + `hint` 12/500 Gray500 오른쪽 | 12 | 온보딩 프로필 등록 |

`labelSuffix`는 Gray500으로 라벨 뒤에 붙습니다. `gap`으로 간격을 바꿉니다.

### TextField

```tsx
<TextField placeholder="고객 이름" />
<TextField readOnly placeholder="우편번호" />          // Gray50 배경
<TextField placeholder="0" suffix="원" />
<TextField appearance="profile" defaultValue="김운영" />
<TextField appearance="large" />                     // 발주사 명
<TextField appearance="filled" />                    // 온보딩
```

| appearance | 높이 | radius | 좌우 | 글자 | 테두리·배경 |
| --- | --- | --- | --- | --- | --- |
| `default` | 50 | 8 | 12 | 16/500 | Gray200 1px 안쪽, 흰 배경 |
| `modal` | 56 | 12 | 12 | 16/500 | 같음 |
| `profile` | 55 | 14 | 16 | 18/500 | 같음 |
| `large` | 59 | 12 | 18 | 16/500 | Gray300 1px **바깥** |
| `filled` | 52 | 12 | 16 | 16/500 | 테두리 없음, Background/2 |

- 입력값 Gray900, 플레이스홀더 Gray500, 읽기 전용·비활성 Gray50 배경, 포커스 Secondary 테두리, `invalid` Warning/1 테두리.
- `radius`로 화면별 반경을 덮습니다. `className`은 바깥 상자, `inputClassName`은 input에 붙습니다. `ref`는 input으로 갑니다.

### SelectField

```tsx
<SelectField value={null} placeholder="작업 유형 선택" appearance="default" options={workTypeOptions} onChange={setWorkType} />
<SelectField radius={8} value={tech} options={techOptions} onChange={setTech} />   // 배정 확인(56px, radius 8)
<SelectField value={null} placeholder="고객 요청 / 기사 사정 / 중복 등록 / 기타" placeholderTone="strong" options={reasons} onChange={setReason} />
<SelectField appearance="large" value="hvac" options={[{ value: 'hvac', label: '냉난방 설비' }]} onChange={...} />
```

- 오른쪽 ▼는 `caret-down`(#727272)을 18×11 상자 안 위 3px에 둡니다(Figma Polygon 1).
- 값 글자 Gray700(`large`는 Gray900), 플레이스홀더 Gray500(`placeholderTone="strong"`이면 Gray700 — 작업 취소 사유), 열리면 Secondary 테두리 + 값 Gray900(총관리자 지정 시안).
- 옵션 패널은 Menu, 트리거 너비, 6px 아래. 선택지가 없으면 열지 않습니다. 새 작업 등록의 옵션 패널(1834:13179)처럼 모양이 다른 패널은 섹션 지역 컴포넌트입니다(OptionSelect·CancelReasonSelect·ListSelect·TypeSelect).

### TextArea

`<TextArea placeholder="..." height={188} />` — Gray200 테두리, radius 12, padding 16/12, 16/500 Gray800, 플레이스홀더 Gray500, 포커스 Secondary, 크기 조절 없음.

### SearchInput

`<SearchInput className={styles.search} placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />` — 높이 50, padding 10/16, radius 12, Gray200 테두리, `search` 28(#b5b5b5, 1951:19172) + 간격 9, 20/500 입력값 Gray800(1951:22730), 플레이스홀더 #b5b5b5. 너비는 className으로(인력관리 701).

### Checkbox

```tsx
<Checkbox checked={all} onChange={(e) => setAll(e.target.checked)} gap={12} label={<span className="t-body-s-bold">전체 동의</span>} />
<Checkbox checked={agree} onChange={...} uncheckedIcon="check" color="var(--color-gray-900)" label={consentText} />   // 계정 탈퇴 동의(1325:8866 Gray900)
```

| prop | 기본 | 설명 |
| --- | --- | --- |
| `checked` | — | 선택 여부(제어형) |
| `color` | `var(--color-secondary)` | 선택 색(약관·승인대기 보라). 계정 탈퇴 동의 후는 Gray900(1325:8866) |
| `uncheckedIcon` | `box` | `box`: Gray400 빈 사각형(승인대기) · `check`: Gray500 체크 테두리(계정 탈퇴 동의 전) |
| `gap` | 8 | 글자 간격(약관 항목 8, 전체 동의 12, 승인대기 이름 26) |
| `label`, `labelClassName` | — | 글자 스타일은 화면에서 지정 |

### UnderlineTabs

```tsx
<UnderlineTabs
  tabs={[{ key: 'company', label: '발주사 정보' }, { key: 'members', label: '인력관리' }, { key: 'types', label: '유형 설정' }, { key: 'admin', label: '관리자 설정' }]}
  value={tab}
  onChange={(key) => navigate(TAB_PATH[key])}
/>
<UnderlineTabs tabs={[{ key: 'ALL', label: '전체', count: 7 }, { key: 'PENDING_ACCEPT', label: '배정됨', count: 7 }, ...]} value={status} onChange={setStatus} />
```

탭 128px(`tabWidth`), 줄 높이 47(탭 128×45가 y=1). `tall: true`인 탭은 Figma 47px 인스턴스(조직 설정 Component 11·12, 진행 보드 Component 15~17)처럼 y=0에 놓여 라벨이 1px 위, 막대가 1px 아래(라벨 아래 16px)입니다. 라벨 20/500(비활성 #4c4c4c — 화면 인스턴스 값, 활성 #000), 건수 16/500 Secondary(padding 2/8, 간격 6), 라벨 아래 14px에 3px 막대(활성 Secondary). 진행 보드 탭은 새 표기 **전체·배정됨·작업전·작업중·완료**를 씁니다(Figma의 수락대기·수락됨·작업완료는 옛 표기).

### PillTabs

```tsx
<PillTabs tabs={[{ key: 'EMPLOYEE', label: '직원유형' }, { key: 'TECHNICIAN', label: '기사유형' }, { key: 'WORK', label: '작업유형' }]} value={category} onChange={setCategory} />
<PillTabs tabs={[{ key: 'ALL', label: '전체', count: 7 }, { key: 'EMPLOYEE', label: '직원', count: 7 }, { key: 'TECHNICIAN', label: '기사', count: 7 }]} value={kind} onChange={setKind} />
```

높이 45, padding 10/16, radius 51, 간격 15, 18/600, 글자·건수 불투명 80%. 선택: Gray50 배경 + Primary 글자, 기본: Gray600. 건수 16/500 Secondary. 탭 간격 기본 12(`gap`).

### FilterChips

```tsx
<FilterChips items={[{ key: 'all', label: '전체' }, { key: 'unread', label: `안 읽음 ${unread}` }]} value={filter} onChange={setFilter} />
```

98×40(`width`), padding 8/12, radius 29, 16/500, 간격 12. 선택: Primary 배경 + 흰 글자, 기본: Primary 1px 테두리 + Primary 글자.

### Pagination

```tsx
<Pagination page={page} pageCount={pages} onChange={setPage} summary={`${total}건 중 ${shown}건 표시`} />
```

높이 32 줄, 요약 16/500 Gray600, 이전·다음 32px(갈 수 없으면 Gray300, 있으면 Gray900), 번호 32×32 radius 8 16/500 Gray700(간격 6), 현재 `#e0e0ee` 배경 + Secondary. 번호는 최대 5개(`maxPages`).

### Chip · StatusChip · MemberStatusChip

```tsx
<StatusChip status={task.status} />                                // 목록·보드(md)
{task.rejection && <StatusChip status="REJECTED" />}
{task.delayed && <StatusChip status="DELAYED" />}
<StatusChip status={task.status} size="sm" />                     // 작업 상세
<StatusChip status="ACCEPTED" appearance="solid" />               // 타임테이블 블록 칩
<MemberStatusChip status={member.status} />
<Chip tone="inProgress">불일치</Chip>                              // 승인대기 '불일치'(옛 Status Chip 570:2966)
<Chip tone="inProgress" size="xs">작업중</Chip>                    // 작업유형 상태 882:4620 모양
```

| 표기 | `status` | 배경 / 글자 |
| --- | --- | --- |
| 등록 | `REGISTERED` | Registered/2 / Registered/1 |
| 배정됨 | `PENDING_ACCEPT` | Pending/3 / Pending/1 |
| 작업전 | `ACCEPTED` | Accepted/2 / Accepted/1 |
| 작업중 | `IN_PROGRESS` | InProgress/4 / InProgress/5 |
| 완료 | `COMPLETED` | Completed/2 / Completed/1 |
| 거절(배지) | `REJECTED` | Warning/2 / Warning/1 |
| 지연(배지) | `DELAYED` | Delayed/2 / Delayed/1 |

- 크기: `md` 높이 30·16/500·padding 4/10·radius 50(작업상태 컬러칩 2293:11954) · `sm` 높이 28·14/500(작업 상세 컬러 칩 2423:12709) · Chip `xs` 높이 25·12/500·padding 4/7·radius 6.
- `appearance="solid"`(radius 8)는 타임테이블 블록 칩: 배정됨 Pending/2 + Pending/1, 작업전 Secondary + 흰색, 작업중 InProgress/1 + 흰색. 다른 상태는 soft로 그립니다.
- 취소(`CANCELED`) 칩 시안은 없습니다. 취소된 작업은 목록·보드·타임테이블에서 숨깁니다.
- 옛 표기 → 새 표기(디자이너 전달사항 2026.10.08): 대기중 → 등록 · 수락대기·수락 대기·배정 대기·대기(타임테이블 블록) → 배정됨 · 수락됨 → 작업전 · 확정 → 실제 상태(수락했으면 작업전, 아니면 배정됨) · 작업완료 → 완료 · 거절(상태 칸) → 등록 + 거절 배지.
- MemberStatusChip: 활성화 `#4f3bfe` 12% + `#4f3bfe`, 비활성화 Gray100 + Gray700(높이 30, 16/500).

### WorkTypeBadge

`<WorkTypeBadge name={type.name} color={type.color} />` — 높이 26, padding 4/8, radius 5, 점 6px + 간격 6, 15/600(line-height auto = 18px, 자간 0).

| TypeColor | 글자·점 | 배경 |
| --- | --- | --- |
| `PURPLE` | Install/1 | Install/2 |
| `BLUE` | Inspection/1 | Inspection/2 |
| `YELLOW` | Repair/1 | Repair/2 |
| 그 외(`GRAY` `GREEN` `BROWN` `PINK` `RED`), `null`=GRAY | `--color-type-*` | 같은 색 20% |

### Avatar

```tsx
<Avatar variant="user" size={50} />                    // 사이드바: Accepted/2 원 + user(Primary100) 28
<Avatar variant="initial" size={36} text={company.name} />   // 발주사 전환: 첫 글자 Secondary 14/500(줄 20) · 62px이면 24/500(줄 34, 기사 작업이력)
<Avatar variant="profile" size={130} />                 // 마이페이지: #e2e2f0 원 + user-fill(#56569d) 72.8
<Avatar variant="image" size={130} src={avatarUrl} />   // src 없으면 profile 모양
```

타임테이블 기사 사진은 `DriverListItem`이 Figma 이미지 채움(바둑판 자리표시, `src/assets/images/avatar-placeholder.png`)을 씁니다.

### StateMessage

```tsx
<StateMessage
  icon={<Icon name="wifi-off-circle" />}
  title="네트워크 연결 실패"
  description={'요청을 처리하는 중 네트워크 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'}
  actions={<><Button variant="outline">작업 등록으로</Button><Button icon="refresh">다시 시도</Button></>}
/>
<StateMessage variant="list" icon={<Icon name="document-text" />} title="등록된 작업이 없어요" actions={<Button icon="plus">새 작업 등록</Button>} />
<StateMessage variant="card" icon={<Icon name="users-circle" />} title="등록된 기사가 없어요"
  description="기사를 등록하면 타임테이블에서 일정을 배정할 수 있어요"
  actions={<Button icon="arrow-back" iconSize={24}>조직 설정으로</Button>} />
```

| variant | 간격(아이콘→제목, 제목→설명, →버튼) | 제목 | 설명 | 예 |
| --- | --- | --- | --- | --- |
| `page`(기본) | 30, 16, 36 | 28/700 Primary | 20/500 Gray700 | 네트워크 실패 1338:6567(wifi-off-circle), 알림 없음 2053:9818(bell-circle) |
| `list` | 24, 12, 20 | 20/600 Gray500 | 14/500 Gray600 | 작업 목록 공란 1802:5687(document-text 40), 진행 보드 목록 없음 |
| `card` | 16, 8, 20 | 20/600 Gray900 | 14/500 Gray600 | 기사 0명 1834:11068(512×300, Background/3, Gray200 테두리, radius 18, `--shadow-popover`) |

- 버튼 간격 10. 설명은 `\n`으로 줄을 바꿉니다(`white-space: pre-line`).
- `page`의 바깥 카드(1557×741, Gray100 1px 바깥 테두리 위·좌·우, radius 18)와 위 여백(아이콘 y=202)은 화면에서 잡습니다.

### Modal · Dialog · InfoBox · ModalPanel

```tsx
<Dialog
  open={open}
  onClose={close}
  tone="success"
  title="배정 확인"
  description={'대기함 작업을 놓은 칸의 기사 · 시간으로 배정합니다.\n값을 확인 · 수정한 뒤 확정하세요.'}
  actions={<><Button variant="secondary" style={{ width: 97 }} onClick={close}>취소</Button><Button style={{ width: 130 }} onClick={confirm}>배정 확정</Button></>}
>
  <Field label="담당기사" labelStyle="modal"><SelectField radius={8} ... /></Field>
</Dialog>

<Dialog open title="유형 삭제 확인" headerGap={12} descriptionTone="muted"
  description={"이 유형을 삭제하면 해당 유형으로 지정된 모든 직원·작업이\n'유형 없음'으로 변경됩니다."}
  actions={<><Button variant="secondary" style={{ width: 97 }}>취소</Button><Button variant="danger-soft" style={{ width: 95 }}>삭제</Button></>}>
  <InfoBox>삭제된 유형은 복구할 수 없습니다.</InfoBox>
</Dialog>

<Modal open={open} onClose={close} aria-label="새 작업 등록">
  <ModalPanel title="새 작업 등록" bodyClassName={styles.body}>…</ModalPanel>
</Modal>
```

- Modal: 캔버스 전체(사이드바 포함)를 `--color-dim`으로 덮고 내용을 가운데 둡니다(Figma 모달도 1920×1080 가운데). `onClose`가 있으면 Esc로 닫힘, `closeOnOverlayClick` 기본 false.
- Dialog: 흰 카드, `width` 기본 575(약관 동의 519), radius 18, padding 30, 세로 간격 24. 제목 24/700 Gray900, 아이콘이 있으면 28px + 간격 12.

| Dialog prop | 값 |
| --- | --- |
| `tone` | `success`(check-circle-fill Gray900) · `danger`(warning-triangle-fill Warning/1) · `cancel`(close-circle-fill Primary) · `notice`(alert-circle-fill Repair/1) · 없음 |
| `descriptionTone` | `default` 20/500 Gray800 · `muted` 20/500 Gray700 · `subtle` 20/500 Gray600 · `regular` 20/400 Gray800 |
| `headerGap` | 제목↔설명. 기본 23(배정 확인·작업 취소·일정 충돌·계정 탈퇴), 12(유형 삭제·승인 거절), 16(총관리자 지정·약관 동의) |
| `bodyGap` | 머리말↔본문. 기본 24, 약관 동의 16 |
| `showClose` | 제목 오른쪽 `close` 28(Gray600) — 약관 동의 |
| `actions` | 오른쪽 정렬, 간격 12 |

| 모달 | tone | 설명 tone | 버튼 |
| --- | --- | --- | --- |
| 배정 확인 1325:8954 | success | default | secondary 97 '취소' · primary 130 '배정 확정' |
| 일정 충돌 1325:10373 | danger | default | secondary 97 · primary 151(Figma 문구 '충동 확인 후 배치' 그대로 — 오타로 보이면 타임테이블 담당이 확인) |
| 변경된 정보입니다 1325:11695 | notice | default | primary '확인' |
| 작업 취소 확인 785:7691 | cancel | default | ghost 97 '닫기' · danger-soft 120 '작업 취소'(사유 전 disabled) |
| 유형 삭제 확인 2008:27365 | 없음 | muted, headerGap 12 | secondary 97 · danger-soft 95 |
| 총관리자 지정 2232:10017 | 없음 | muted, headerGap 16 | secondary 97 · primary 129 '지정 확정' |
| 승인 거절 2008:26090 | 없음 | muted, headerGap 12 | secondary 97 '닫기' · primary 95 '거절' |
| 계정 탈퇴 확인 2277:12258 | 없음 | regular | secondary 120(Gray200 테두리) · danger 120 '탈퇴' |
| 약관 동의 1453:7505 | 없음, showClose | subtle, headerGap 16, bodyGap 16, width 519 | accent fullWidth |

- 일정 충돌의 회색 상자(Gray50, radius 8, 515×90)와 '기존' 칩(Gray100 + Gray700, 12/500, radius 8)은 타임테이블에서 만듭니다.
- InfoBox: Background/3, radius 10, padding 16, 16/500 Gray600.
- ModalPanel: `width` 기본 1337, 머리말 높이 58·padding 16/20·Gray200 아래선·위 radius 18·제목 18/700 Primary, 본문 Background/3·padding 30·아래 radius 18. 섹션 카드(흰 배경, radius 12, padding 30)와 하단 `Button size="lg"`는 화면에서 배치합니다. 작업 상세·회사 코드 관리·승인대기 모달은 머리말 모양이 달라 `Modal` 안에 직접 만듭니다.

### Sidebar(AppLayout 연결)

`src/app/layouts/AppLayout.tsx`가 스토어와 연결해 모든 앱 화면에 그립니다. 섹션 화면에서 직접 쓰지 않습니다.

- 연결: `selectCurrentUser`(이름), `selectCurrentMembership`(역할 → `COMPANY_ROLE_LABEL`), `selectCurrentCompany`(회사명), `s.memberships`(발주사 목록), `s.session.currentCompanyId`, `s.switchCompany`, `s.logout`(후 `/login`으로 이동).
- 메뉴: 타임테이블 `/timetable`, 작업 목록 `/tasks`, 진행 보드 `/board`, 조직 설정 `/org/company`, 알림함 `/notifications`, 마이페이지 `/mypage`. 선택 메뉴는 경로 첫 구간(`/org/*`는 조직 설정).
- 검색: 입력만(결과 시안 없음).
- 소속 1곳: 사용자 카드 오른쪽 `logout` 32.1px(#898eae) → 로그아웃. 2곳 이상: 카드 전체가 버튼, `selector` 30px(#898eae) → '발주사 전환' 팝오버(카드 위 12px, 274px, 현재 회사 Background/2 + 체크, 구분선, 로그아웃). 로컬 시드의 총관리자 오르빗(OO건설 총관리자 + 협력 발주사 직원)으로 확인합니다.
- 좌표(319×1080): 로고 (24,34) · 검색 (23,110) 274×54 · 메뉴 (23,188) 68px 간격 8 · 구분선 y=786(2px, 흰색 12%) · 알림함 y=798 · 사용자 카드 y=950(68px) · 아래 여백 62. 화면 높이가 1080이 아니면 아래 묶음이 바닥에 붙습니다.
- 메뉴 글자 20/500, 위 메뉴 `#f1f1f1`(아이콘 Gray50), 알림함·마이페이지 흰색, 선택 안 된 메뉴 불투명 50%, 선택 Support/select2 배경 radius 11.

### DriverListItem · WorkCard · ScheduleCard(타임테이블)

```tsx
<DriverListItem name="김민수" role="전문 기사" avatarSrc={member.avatarUrl} />
<WorkCard workType={{ name: '설치', color: 'PURPLE' }} title="인덕션 교체" assigneeLabel="기사 미정" meta="등록 3일 경과" />
<ScheduleCard status="ACCEPTED" width={234} title="인덕션 설치" timeRange="09:00 - 11:00" staffLabel="직원 (박서준)" />
```

- DriverListItem(443:1277): 184×111, padding 4/16, 간격 16, 오른쪽·아래 Gray300 1px, 사진 54px, 이름 20/600 Gray900, 유형 16/500 Gray700(간격 4).
- WorkCard(443:1197): 247×122 흰 카드, radius 12. 배지 (16,16), 오른쪽 위 문구 14/500 Gray600(오른쪽 16, 위 16), 작업명 20/600 #000 (16,60), 시계 16 + 간격 6 + 13/500 Gray600 (16,90). 대기함 패널(295×836, Primary, radius 20, 제목 '대기함' 24/700 흰색 (24,24), 건수 20/500 흰색 50% (97,29), 카드 (24,77)부터 간격 14)은 타임테이블에서 만듭니다.
- ScheduleCard: 높이 110, 오른쪽 radius 12, 왼쪽 막대, 내용 (33,12) 작업명 20/500 · 시간 14/500 Gray600(간격 2) · 9 아래 직원 칩(높이 30, padding 2/4, 흰색 60%, radius 6, people-fill 24 + 14/500 Gray900 90%) · 상태 칩 오른쪽 위 (12,12) solid. `width`는 시간 길이로 계산합니다.

| status | 배경 | 막대 | 직원 칩 테두리 | Figma |
| --- | --- | --- | --- | --- |
| `PENDING_ACCEPT` | Pending/3 | Gray500 9px | Gray300 | 443:1651 |
| `ACCEPTED` | Confirmed | Secondary 9px | Primary100 | 443:1662 |
| `IN_PROGRESS` | InProgress/2 | InProgress/1 8px(내용 x=32) | InProgress/3 | 443:1661 |

편집 모드 선택·드래그 중 모양(1039:4935 등)과 완료 블록 색은 이 컴포넌트에 없습니다. 타임테이블 담당이 시안을 확인해 className으로 더합니다.

## 5. Figma 이름 → DS

| Figma(레이어·컴포넌트) | DS |
| --- | --- |
| `Button` Property 1=Icon-Filled / Text-Filled / Text-Stoke / Icon-Stroke / Text-Secondary | `Button` primary(+icon) / primary / outline / outline(+icon) / secondary |
| `Select` | `SelectButton`, 패널까지 `FilterSelect` |
| `직원 유형` Default/ReadOnly/Open, Drop Down=x | `CompactSelect` |
| `직원 유형` Drop Down=o | `Menu` + `MenuItem` |
| `Work Type Badge` Installation/Inspection/Repair | `WorkTypeBadge` PURPLE/BLUE/YELLOW |
| `작업상태 컬러칩` State=… | `StatusChip` md |
| `작업 상세 컬러 칩` Status=… | `StatusChip size="sm"` |
| `Status Chip`(옛 표기, Waiting/Confirmed/In Progress 채움형) | `StatusChip appearance="solid"` |
| `Status Chip` 570:2966 불일치 | `Chip tone="inProgress"` |
| `작업유형 상태` | `Chip size="xs"` |
| `Component 15`·`Component 16` 활성화/비활성화 | `MemberStatusChip` |
| `Tab Bar`(Component 2·11~17 인스턴스) | `UnderlineTabs` |
| `Tab / Type`(Component 64~66), 인력관리 전체/직원/기사 | `PillTabs` |
| 알림창 '전체 / 안 읽음' Status Chip 프레임 | `FilterChips` |
| `SIde bar`, `Side bar-1`, `Side bar` 로고 줄 | `Sidebar`(AppLayout), `Logo` |
| `Icon` Type=… / iconify 레이어 | `Icon`(§6) |
| `Driver List Item` · `Work Card` · `Schedule Card` | `DriverListItem` · `WorkCard` · `ScheduleCard` |
| 모달 카드 `Frame 2147239253` + 배경 `작업 목록` 프레임(#000 40%) | `Dialog`(+`Modal`) |

## 6. 아이콘 목록(66)

`src/assets/icons/<이름>.svg`. "Figma 색"은 원본 노드 색입니다(단색 아이콘은 `currentColor`로 바뀌어 있으니 `color`로 지정). 다색 아이콘 5종은 원래 색이 고정입니다.

| 이름 | 원래 크기 | Figma 색 | Figma 원본 | 노드 |
| --- | --- | --- | --- | --- |
| `alert-circle-fill` | 28×28 | #222222 | Icon / Type=warning01 (≈ si:warning-fill, 변경정보 #f59e0a) | 1338:6745 |
| `archive` | 28×28 | #1C1B2A | Icon / Type=box | 1338:6723 |
| `arrow-back` | 24×24 | #767676 | Icon / Type=Back (eva:arrow-back-outline) | 1834:13130 |
| `arrow-right` | 24×24 | #9B9B9B | basil:arrow-left-outline(오른쪽 화살표) | 776:3039 |
| `arrow-right-circle` | 34×34 | 다색 | 온보딩 '다음' 버튼 흰 원 + 화살표 | 1453:12612 |
| `ban` | 24×24 | #404040 | gravity-ui:ban(비활성화) | 2008:35280 |
| `bell` | 28×28 | white | Icon / Type=Bell | 1477:9052 |
| `bell-circle` | 68×68 | 다색 | 알림 없음 아이콘(레이어 이름 icon_wifi_off) | 2053:9820 |
| `board` | 28×28 | #F4F4F4 | Icon / Type=진행보드 | 1453:9232 |
| `box-fill` | 28×28 | #1C1B2A | bxs:box(대기함 잔여·거절 작업 머리말) | 785:4963 |
| `box-open` | 40×40 | #9B9B9B | bx:box(대기함 빈 상태) | 1834:9149 |
| `calendar` | 28×28 | #F4F4F4 | Icon / Type=타임테이블 | 1453:9207 |
| `caret-down` | 13×8 | #727272 | Polygon 1(선택 필드 ▼) | 1325:9686 |
| `check` | 24×24 | #1C1B2A | akar-icons:check | 1921:11001 |
| `check-circle` | 24×24 | #404040 | keyline-icons:circle-check(활성화) | 2008:35292 |
| `check-circle-fill` | 28×28 | #222222 | Icon / Type=check (= akar-icons:circle-check-fill) | 1338:6741 |
| `checkbox-checked` | 24×24 | #4F3BFE | mingcute:checkbox-fill | 1453:14366 |
| `checkbox-outline-checked` | 24×24 | #9B9B9B | octicon:checkbox-16 | 1325:8951 |
| `checkbox-unchecked` | 24×24 | #AAAAAA | mingcute:checkbox-fill 미선택(승인대기) | 1888:10735 |
| `chevron-down` | 28×28 | #222222 | Icon / Type=Toggle | 456:4222 |
| `chevron-down-sm` | 8×5 | #404040 | 직원 유형 Vector 3 | 1377:7883 |
| `chevron-right` | 28×28 | #222222 | Icon / Type=Next(약관 항목은 26px #aaaaaa) | 496:2431 |
| `clock` | 16×16 | #767676 | fi-rs-clock | 443:1204 |
| `close` | 28×28 | #767676 | carbon:close | 1453:14361 |
| `close-circle-fill` | 28×28 | #1C1B2A | Icon / Type=Cancel (= ant-design:close-circle-filled) | 1338:6727 |
| `copy` | 24×24 | #AAAAAA | Icon / Type=Copy 01(Copy02 = 흰색 같은 도형) | 1541:4878 |
| `crown` | 20×16 | #4F3BFE | fa-solid:crown(총관리자) | 1951:22517 |
| `document-fill` | 40×40 | #CECECE | famicons:document(완료 보고 없음) | 1699:8540 |
| `document-text` | 40×40 | #AAAAAA | famicons:document-text-outline(작업 목록 공란) | 1802:5683 |
| `download` | 24×24 | #404040 | Icon / Type=Download | 1541:4905 |
| `edit` | 24×24 | #9B9B9B | ci:edit-pencil-02(타임테이블 '편집') | 945:6360 |
| `error-fill` | 28×28 | #767676 | Icon / Type=warning02 | 1543:5036 |
| `external-link` | 24×24 | #222222 | check2-square(상세보기) | 1951:22507 |
| `file-text` | 42×42 | #9B9B9B | Icon / Type=File | 1951:21989 |
| `help-circle` | 24×24 | #141B34 60% | help-circle(연결 끊김 안내) | 560:2863 |
| `image` | 28×28 | 다색 | 사진 자리(새 작업 등록 사진 칸) | 1686:7208 |
| `info-circle` | 24×24 | #222222 | Icon / Type=info(인력관리 안내 문구는 Gray500) | 1712:7392 |
| `kakao` | 22×22 | black | Kakao Symbol | 2423:12778 |
| `list` | 28×28 | #F4F4F4 | Icon / Type=작업목록 | 1453:9222 |
| `lock` | 24×24 | #9B9B9B | Icon / Type=Lock(= 타임테이블 '보기' 945:6355) | 1338:6785 |
| `logout` | 30×30 | #F5F6F8 | Icon / Type=Logout2(사이드바 32.1 #898eae, 팝오버 24 #aaaaaa) | 1921:10927 |
| `mail` | 24×24 | white | cuida:mail-outline(승인대기) | 1951:19302 |
| `message` | 24×24 | #767676 | boxicons:message-reply(기사에게 요청 보내기) | 785:5441 |
| `more-vertical` | 20×20 | #9B9B9B | fa7-solid:ellipsis-vertical(더보기) | 2008:26948 |
| `page-next` | 32×32 | #222222 | 페이지네이션 다음 | 460:4671 |
| `page-prev` | 32×32 | #CECECE | 페이지네이션 이전 | 460:4667 |
| `pencil` | 24×24 | white | Icon / Type=pencil | 1338:6796 |
| `pencil-line` | 24×24 | #404040 | akar-icons:pencil('수정하기') | 1924:16454 |
| `people-fill` | 24×24 | #2A343D | people-fill(일정 블록 직원 칩) | 443:1657 |
| `plus` | 28×28 | #222222 | Icon / Type=Plus | 456:4247 |
| `print` | 24×24 | #404040 | Icon / Type=Print | 1541:4911 |
| `qr-code` | 24×24 | #CECECE | Icon / Type=QR 02(QR 01은 같은 도형 40px) | 1584:9258 |
| `refresh` | 28×28 | #222222 | Icon / Type=refresh('다시 시도') | 1338:6403 |
| `retry` | 24×24 | #404040 | Icon / Type=Retry(재발급) | 1541:4900 |
| `search` | 28×28 | #222222 | Icon / Type=search (= heroicons:magnifying-glass-solid #767676) | 456:4258 |
| `selector` | 30×30 | #898EAE | heroicons-outline:selector | 1921:10884 |
| `sidebar-left` | 28×28 | #222222 | Icon / Type=sidebar-left(대기함 접기) | 456:4221 |
| `trash` | 24×24 | #D71A29 | eva:trash-2-outline(삭제) | 2008:35285 |
| `user` | 28×28 | white | Icon / Type=People(사이드바 아바타 #a99fff) | 1477:9054 |
| `user-fill` | 73×73 | #56569D | Icon / 속성 1=사용자(마이페이지 프로필) | 463:5639 |
| `users` | 28×28 | #F4F4F4 | Icon / Type=조직설정(Type=인력 = 42px) | 1453:9238 |
| `users-circle` | 46×46 | 다색 | 기사 0명 아이콘(레이어 이름 famicons:document-text-outline) | 1834:11070 |
| `warning-circle-fill` | 40×40 | #D71A29 | mingcute:warning-fill | 1699:8543 |
| `warning-triangle-fill` | 28×28 | #222222 | Icon / Type=Conflict (= fluent:warning-32-filled, 일정 충돌은 #d71a29) | 1338:6737 |
| `wifi-off-circle` | 68×68 | 다색 | icon_wifi_off(네트워크 실패) | 1699:8545 |
| `x-circle-fill` | 30×30 | #F00013 | ep:circle-close-filled(계정 탈퇴 불가) | 1230:5188 |

로고 SVG는 `src/assets/logo/`(`orbit-lockup.svg`, `orbit-wordmark.svg`, `orbit-wordmark-hero.svg`, `orbit-mark.svg`)에 있고 `Logo`로만 씁니다.

## 7. DS에 없는 것(섹션에서 구현)

- 표(머리줄·행 구분선), 타임테이블 격자·시간축·날짜 이동·보기/편집 토글, 진행 보드 요약 카드, 작업 상세 모달 머리말, 회사 코드 관리·승인대기 모달 내부, 마이페이지 목록 행, 랜딩 화면.
- 승인대기 표의 '기사' 칩(59×33 테두리형)처럼 한 화면에만 있는 모양은 그 화면 담당이 시안을 확인해 지역 컴포넌트로 만듭니다.
- 새 작업 등록 옵션 패널(1834:13179), 유형 설정 입력 오류(2008:34201), 발주사 정보 입력 중(1908:13162)의 포커스 모양은 DS에서 확인하지 않았습니다. 다르면 className으로 맞추고 보고합니다.
