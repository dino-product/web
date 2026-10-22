import { readFile, writeFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import pg from 'pg';

// Snapshot of the 52 scenarios in src/mocks/seed.ts; dates are KST day offsets.
const PEOPLE = {
  "me": "오르빗",
  "kimUnyeong": "김운영",
  "parkSeojun": "박서준",
  "leeJieun": "이지은",
  "songJihwan": "송지환",
  "yangSeohui": "양서희",
  "kimMinsu": "김민수",
  "kimMinjun": "김민준",
  "leeMinjun": "이민준",
  "hongGildong": "홍길동",
  "kimTaehun": "김태훈",
  "parkSeoyeon": "박서연",
  "leeCheolho": "이철호",
  "leeJunhyeok": "이준혁",
  "choiDonguk": "최동욱"
};
const CUSTOMERS = {
  "leeJeongho": [
    "이정호",
    "010-1234-5678",
    "04043",
    "서울시 마포구 합정동 123-4",
    "2층"
  ],
  "parkJihun": [
    "박지훈",
    "010-2345-6789",
    "06234",
    "서울시 강남구 역삼동 678-12",
    "3층 301호"
  ],
  "choiYuri": [
    "최유리",
    "010-3456-7890",
    "05551",
    "서울시 송파구 잠실동 45-6",
    "102동 1503호"
  ],
  "jeongMinho": [
    "정민호",
    "010-4567-8901",
    "06611",
    "서울시 서초구 서초동 1305-7",
    "상가 1층"
  ],
  "hanSohui": [
    "한소희",
    "010-5678-9012",
    "04400",
    "서울시 용산구 한남동 72-1",
    ""
  ],
  "ohJunseok": [
    "오준석",
    "010-6789-0123",
    "04782",
    "서울시 성동구 성수동2가 289-5",
    "4층"
  ],
  "yunSeoa": [
    "윤서아",
    "010-7890-1234",
    "07327",
    "서울시 영등포구 여의도동 22",
    "1203호"
  ],
  "kimHajun": [
    "김하준",
    "010-8901-2345",
    "01690",
    "서울시 노원구 상계동 1032",
    "201동 704호"
  ],
  "jangMirae": [
    "장미래",
    "010-9012-3456",
    "03305",
    "서울시 은평구 불광동 281-3",
    ""
  ],
  "kangDoyun": [
    "강도윤",
    "010-1357-2468",
    "05066",
    "서울시 광진구 자양동 680-63",
    "2층"
  ],
  "seoJia": [
    "서지아",
    "010-2468-1357",
    "06978",
    "서울시 동작구 상도동 512",
    "B동 302호"
  ],
  "munTaeyang": [
    "문태양",
    "010-3579-2468",
    "07702",
    "서울시 강서구 화곡동 1067-12",
    ""
  ],
  "baeSujin": [
    "배수진",
    "010-4680-1357",
    "04536",
    "서울시 중구 명동2가 33-1",
    "5층"
  ],
  "shinDongha": [
    "신동하",
    "010-5791-3468",
    "03053",
    "서울시 종로구 삼청동 63-4",
    ""
  ],
  "imHaneul": [
    "임하늘",
    "010-6802-4579",
    "08787",
    "서울시 관악구 봉천동 1570-1",
    "1층 상가"
  ],
  "kwonSoyeon": [
    "권소연",
    "010-2581-4703",
    "03986",
    "서울시 마포구 연남동 239-12",
    "301호"
  ],
  "leeSeungwoo": [
    "이승우",
    "010-3692-5814",
    "02841",
    "서울시 성북구 안암동5가 102-4",
    ""
  ],
  "parkMinji": [
    "박민지",
    "010-4703-6925",
    "06035",
    "서울시 강남구 신사동 549-8",
    "7층"
  ],
  "kimDohyun": [
    "김도현",
    "010-5814-7036",
    "05854",
    "서울시 송파구 문정동 642",
    "1101호"
  ],
  "songHayoon": [
    "송하윤",
    "010-6925-8147",
    "01811",
    "서울시 노원구 공릉동 381",
    "3동 202호"
  ],
  "ohYejin": [
    "오예진",
    "010-7036-9258",
    "02455",
    "서울시 동대문구 회기동 60-17",
    ""
  ],
  "leeSeoyoung": [
    "이서영",
    "010-8147-0369",
    "04157",
    "서울시 마포구 도화동 179-11",
    "2층"
  ],
  "hanJiwon": [
    "한지원",
    "010-9258-1470",
    "07995",
    "서울시 양천구 목동 916",
    "목동아파트 5단지 503호"
  ]
};
const SPECS = [
  {"id":"demo-completed","title":"시스템 에어컨 설치","work":"install","status":"COMPLETED","tech":"kimMinjun","day":0,"start":"09:00","minutes":120,"customer":"parkJihun","price":450000,"payment":"카드 결제","by":"kimUnyeong","created":[-3,"10:12"],"assigned":[-3,"10:20"],"accepted":[-3,"11:02"],"started":[0,"09:04"],"report":{"at":[0,"11:08"],"memo":"거실·안방 시스템 에어컨 2대 설치를 마쳤습니다. 배관 연결부 누수 점검과 시운전까지 확인했고, 고객에게 리모컨 사용법을 안내했습니다.","parts":"냉매 배관 15m, 드레인 호스 8m, 배관 테이프 2롤"},"photos":6},
  {"id":"task-01","title":"인덕션 설치","work":"install","status":"COMPLETED","tech":"kimMinsu","day":0,"start":"09:00","minutes":90,"customer":"choiYuri","price":180000,"payment":"현장 결제","by":"parkSeojun","created":[-2,"14:30"],"assigned":[-2,"14:36"],"accepted":[-2,"16:10"],"started":[0,"09:02"],"report":{"at":[0,"10:41"],"memo":"기존 가스레인지를 철거하고 3구 인덕션을 설치했습니다. 전용 차단기 작동과 화구별 출력을 확인했습니다.","parts":"전용 차단기 1개, 전원 케이블 3m"},"photos":2},
  {"id":"task-02","title":"정수기 설치","work":"install","status":"COMPLETED","tech":"hongGildong","day":0,"start":"09:00","minutes":60,"customer":"hanSohui","price":80000,"payment":"계좌 이체","by":"kimUnyeong","created":[-4,"09:30"],"assigned":[-4,"09:40"],"accepted":[-3,"08:55"],"started":[0,"09:05"],"report":{"at":[0,"10:02"],"memo":"주방 싱크대 하부에 직수형 정수기를 설치하고 수압과 누수 여부를 확인했습니다.","parts":"분기 밸브 1개, 급수 호스 2m"}},
  {"id":"task-03","title":"건조기 설치","work":"install","status":"COMPLETED","tech":"parkSeoyeon","day":0,"start":"09:30","minutes":90,"customer":"ohJunseok","price":150000,"payment":"카드 결제","by":"kimUnyeong","created":[-2,"11:05"],"assigned":[-2,"11:12"],"accepted":[-2,"13:40"],"started":[0,"09:33"],"report":{"at":[0,"11:02"],"memo":"세탁기 위에 직렬 키트로 건조기를 설치하고 배기·배수 연결을 마쳤습니다.","parts":"직렬 설치 키트 1세트, 배수 호스 1.5m"}},
  {"id":"demo-in-progress","title":"보일러 배관 교체","work":"repair","status":"IN_PROGRESS","tech":"leeMinjun","day":0,"start":"10:00","minutes":120,"customer":"yunSeoa","price":230000,"payment":"현장 결제","by":"kimUnyeong","created":[-3,"15:20"],"assigned":[-3,"15:28"],"accepted":[-2,"09:12"],"started":[0,"10:03"]},
  {"id":"demo-delayed","title":"식기세척기 설치","work":"install","status":"IN_PROGRESS","delayed":true,"tech":"leeCheolho","day":0,"start":"09:00","minutes":120,"customer":"kimHajun","price":200000,"payment":"현장 결제","by":"parkSeojun","created":[-5,"10:40"],"assigned":[-5,"10:46"],"accepted":[-4,"18:05"],"started":[0,"09:41"]},
  {"id":"task-04","title":"서초 상가 전기 공사","work":"install","status":"IN_PROGRESS","tech":"leeJunhyeok","day":0,"start":"10:00","minutes":180,"customer":"jeongMinho","price":380000,"payment":"계좌 이체","by":"kimUnyeong","created":[-6,"13:00"],"assigned":[-6,"13:10"],"accepted":[-5,"09:20"],"started":[0,"10:05"]},
  {"id":"task-05","title":"욕실 환풍기 교체","work":"repair","status":"IN_PROGRESS","tech":"hongGildong","day":0,"start":"11:00","minutes":60,"customer":"jangMirae","price":70000,"payment":"현장 결제","by":"me","created":[-1,"09:15"],"assigned":[-1,"09:20"],"accepted":[-1,"10:02"],"started":[0,"11:04"]},
  {"id":"demo-accepted","title":"냉장고 수리","work":"repair","status":"ACCEPTED","tech":"leeMinjun","day":0,"start":"15:00","minutes":90,"customer":"seoJia","price":95000,"payment":"카드 결제","by":"kimUnyeong","created":[-1,"16:20"],"assigned":[-1,"16:25"],"accepted":[0,"08:15"]},
  {"id":"task-07","title":"조명 교체","work":"install","status":"ACCEPTED","tech":"kimTaehun","day":0,"start":"14:00","minutes":90,"customer":"baeSujin","price":110000,"payment":"계좌 이체","by":"kimUnyeong","created":[-4,"14:00"],"assigned":[-4,"14:05"],"accepted":[-3,"10:20"]},
  {"id":"demo-conflict","title":"세탁기 설치","work":"install","status":"ACCEPTED","tech":"leeCheolho","day":0,"start":"13:00","minutes":120,"customer":"shinDongha","price":130000,"payment":"현장 결제","by":"kimUnyeong","created":[-2,"09:05"],"assigned":[-2,"09:20"],"accepted":[-1,"08:40"]},
  {"id":"task-08","title":"콘센트 증설","work":"install","status":"ACCEPTED","tech":"leeJunhyeok","day":0,"start":"15:00","minutes":90,"customer":"imHaneul","price":90000,"payment":"현장 결제","by":"parkSeojun","created":[-3,"16:00"],"assigned":[-3,"16:05"],"accepted":[-2,"08:30"]},
  {"id":"demo-pending","title":"배관 누수 점검 및 교체","work":"repair","status":"PENDING_ACCEPT","tech":"kimMinjun","day":0,"start":"15:00","minutes":120,"customer":"leeJeongho","price":120000,"payment":"현장 결제","by":"kimUnyeong","created":[-1,"08:45"],"assigned":[-1,"08:50"]},
  {"id":"task-06","title":"에어컨 실외기 점검 및 세척","work":"inspect","status":"PENDING_ACCEPT","tech":"kimMinsu","day":0,"start":"13:00","minutes":120,"customer":"kangDoyun","price":120000,"payment":"현장 결제","by":"kimUnyeong","created":[-2,"09:40"],"assigned":[-2,"09:45"]},
  {"id":"task-09","title":"보일러 수리","work":"repair","status":"PENDING_ACCEPT","tech":"parkSeoyeon","day":0,"start":"14:00","minutes":120,"customer":"munTaeyang","price":160000,"payment":"현장 결제","by":"parkSeojun","created":[-3,"09:10"],"assigned":[-3,"09:18"],"accepted":[-3,"11:45"],"rescheduled":{"at":[0,"08:05"],"by":"parkSeojun"}},
  {"id":"task-10","title":"에어컨 점검","work":"inspect","status":"PENDING_ACCEPT","tech":"hongGildong","day":0,"start":"16:00","minutes":60,"customer":"kwonSoyeon","price":60000,"payment":"현장 결제","by":"kimUnyeong","created":[-1,"17:10"],"assigned":[0,"08:00"]},
  {"id":"task-11","title":"가스레인지 점검","work":"inspect","status":"PENDING_ACCEPT","tech":"kimMinsu","day":0,"start":"16:00","minutes":60,"customer":"leeSeungwoo","price":40000,"payment":"현장 결제","by":"me","created":[0,"08:30"],"assigned":[0,"08:35"]},
  {"id":"task-12","title":"에어컨 이전 설치","work":"install","status":"PENDING_ACCEPT","tech":"leeCheolho","day":0,"start":"16:00","minutes":120,"customer":"parkMinji","price":260000,"payment":"카드 결제","by":"kimUnyeong","created":[-1,"13:30"],"assigned":[-1,"13:40"]},
  {"id":"demo-no-report","title":"세탁기 배수 펌프 수리","work":"repair","status":"IN_PROGRESS","tech":"leeMinjun","day":-1,"start":"14:00","minutes":120,"customer":"choiYuri","price":85000,"payment":"현장 결제","by":"kimUnyeong","created":[-3,"11:30"],"assigned":[-3,"11:36"],"accepted":[-2,"14:20"],"started":[-1,"14:06"]},
  {"id":"task-13","title":"에어컨 설치","work":"install","status":"COMPLETED","tech":"parkSeoyeon","day":-1,"start":"10:00","minutes":120,"customer":"kimDohyun","price":300000,"payment":"카드 결제","by":"kimUnyeong","created":[-4,"15:00"],"assigned":[-4,"15:06"],"accepted":[-3,"09:30"],"started":[-1,"10:02"],"report":{"at":[-1,"12:20"],"memo":"벽걸이 에어컨 1대를 설치했습니다. 실외기 앵글 고정과 배관 보온 작업을 마쳤습니다.","parts":"실외기 앵글 1세트, 냉매 배관 5m"}},
  {"id":"task-14","title":"보일러 점검","work":"inspect","status":"COMPLETED","tech":"kimMinsu","day":-1,"start":"09:00","minutes":60,"customer":"songHayoon","price":50000,"payment":"현장 결제","by":"parkSeojun","created":[-3,"10:00"],"assigned":[-3,"10:05"],"accepted":[-3,"13:00"],"started":[-1,"09:01"],"report":{"at":[-1,"09:58"],"memo":"보일러 연소 상태와 배기통 연결을 점검했습니다. 이상 없습니다.","parts":""}},
  {"id":"task-15","title":"냉난방기 필터 교체","work":"repair","status":"COMPLETED","tech":"hongGildong","day":-1,"start":"13:00","minutes":60,"customer":"ohYejin","price":60000,"payment":"계좌 이체","by":"kimUnyeong","created":[-3,"14:10"],"assigned":[-3,"14:15"],"accepted":[-2,"09:40"],"started":[-1,"13:03"],"report":{"at":[-1,"14:05"],"memo":"냉난방기 2대의 필터를 교체하고 송풍 상태를 확인했습니다.","parts":"필터 2개"}},
  {"id":"task-16","title":"전기 배선 점검","work":"inspect","status":"COMPLETED","tech":"kimTaehun","day":-1,"start":"10:00","minutes":120,"customer":"jeongMinho","price":140000,"payment":"계좌 이체","by":"me","created":[-4,"11:00"],"assigned":[-4,"11:05"],"accepted":[-4,"15:30"],"started":[-1,"10:04"],"report":{"at":[-1,"12:10"],"memo":"분전반과 상가 내부 배선을 점검했고 누전 차단기 1개를 교체했습니다.","parts":"누전 차단기 1개"}},
  {"id":"task-17","title":"수도 배관 교체","work":"repair","status":"COMPLETED","tech":"leeCheolho","day":-1,"start":"15:00","minutes":120,"customer":"leeSeoyoung","price":210000,"payment":"현장 결제","by":"kimUnyeong","created":[-3,"17:00"],"assigned":[-3,"17:05"],"accepted":[-2,"08:50"],"started":[-1,"15:02"],"report":{"at":[-1,"17:15"],"memo":"노후 수도 배관을 교체하고 통수 테스트를 마쳤습니다.","parts":"PB 배관 8m, 연결 소켓 6개"}},
  {"id":"task-18","title":"전기레인지 설치","work":"install","status":"COMPLETED","tech":"kimMinjun","day":-1,"start":"11:00","minutes":90,"customer":"hanJiwon","price":170000,"payment":"카드 결제","by":"parkSeojun","created":[-3,"12:00"],"assigned":[-3,"12:05"],"accepted":[-3,"15:00"],"started":[-1,"11:03"],"report":{"at":[-1,"12:40"],"memo":"빌트인 전기레인지를 설치하고 전용 회로를 연결했습니다.","parts":"전원 케이블 2m"}},
  {"id":"task-19","title":"빌트인 오븐 설치","work":"install","status":"ACCEPTED","tech":"kimMinjun","day":1,"start":"10:00","minutes":120,"customer":"jangMirae","price":240000,"payment":"카드 결제","by":"kimUnyeong","created":[-2,"15:40"],"assigned":[-2,"15:45"],"accepted":[-1,"10:40"]},
  {"id":"task-20","title":"에어컨 분해 세척","work":"repair","status":"PENDING_ACCEPT","tech":"hongGildong","day":1,"start":"09:00","minutes":120,"customer":"songHayoon","price":110000,"payment":"현장 결제","by":"parkSeojun","created":[-1,"15:00"],"assigned":[0,"08:20"]},
  {"id":"task-21","title":"김치냉장고 설치","work":"install","status":"ACCEPTED","tech":"parkSeoyeon","day":1,"start":"13:00","minutes":90,"customer":"ohYejin","price":90000,"payment":"카드 결제","by":"kimUnyeong","created":[-2,"10:30"],"assigned":[-2,"10:35"],"accepted":[-2,"12:00"]},
  {"id":"task-22","title":"정수기 점검","work":"inspect","status":"ACCEPTED","tech":"kimMinsu","day":1,"start":"10:00","minutes":60,"customer":"hanSohui","price":40000,"payment":"현장 결제","by":"kimUnyeong","created":[-1,"11:00"],"assigned":[-1,"11:05"],"accepted":[-1,"13:15"]},
  {"id":"task-23","title":"보일러 교체","work":"install","status":"PENDING_ACCEPT","tech":"leeJunhyeok","day":1,"start":"14:00","minutes":180,"customer":"kimDohyun","price":850000,"payment":"계좌 이체","by":"me","created":[-1,"14:20"],"assigned":[-1,"14:25"]},
  {"id":"task-24","title":"스탠드 에어컨 설치","work":"install","status":"ACCEPTED","tech":"leeCheolho","day":2,"start":"10:00","minutes":120,"customer":"leeSeungwoo","price":280000,"payment":"카드 결제","by":"kimUnyeong","created":[-2,"16:00"],"assigned":[-2,"16:05"],"accepted":[-1,"09:10"]},
  {"id":"task-25","title":"배관 설치","work":"install","status":"COMPLETED","tech":"kimMinsu","day":-2,"start":"13:00","minutes":120,"customer":"kimHajun","price":190000,"payment":"현장 결제","by":"kimUnyeong","created":[-5,"09:00"],"assigned":[-5,"09:10"],"accepted":[-5,"11:00"],"started":[-2,"13:02"],"report":{"at":[-2,"15:30"],"memo":"주방 급수·배수 배관을 새로 설치하고 누수 테스트를 마쳤습니다.","parts":"PB 배관 6m, 엘보 4개"}},
  {"id":"task-26","title":"전기 콘센트 교체","work":"repair","status":"COMPLETED","tech":"leeJunhyeok","day":-3,"start":"11:00","minutes":60,"customer":"seoJia","price":50000,"payment":"현장 결제","by":"kimUnyeong","created":[-6,"10:00"],"assigned":[-6,"10:05"],"accepted":[-6,"14:00"],"started":[-3,"11:01"],"report":{"at":[-3,"12:10"],"memo":"거실 콘센트 3구를 교체하고 접지 상태를 확인했습니다.","parts":"매입 콘센트 3개"}},
  {"id":"task-27","title":"가스보일러 설치","work":"install","status":"COMPLETED","tech":"parkSeoyeon","day":-4,"start":"10:00","minutes":180,"customer":"kwonSoyeon","price":920000,"payment":"계좌 이체","by":"kimUnyeong","created":[-9,"10:00"],"assigned":[-9,"10:10"],"accepted":[-8,"09:30"],"started":[-4,"10:05"],"report":{"at":[-4,"13:20"],"memo":"콘덴싱 가스보일러를 설치하고 배기통 기밀 점검을 마쳤습니다.","parts":"배기통 1세트, 분배기 1개"}},
  {"id":"task-28","title":"주방 수전 교체","work":"repair","status":"COMPLETED","tech":"hongGildong","day":-5,"start":"10:00","minutes":60,"customer":"leeJeongho","price":70000,"payment":"현장 결제","by":"parkSeojun","created":[-8,"09:00"],"pastRejection":{"by":"parkSeoyeon","reason":"개인 사정","assigned":[-8,"09:10"],"at":[-7,"18:20"]},"assigned":[-6,"09:00"],"accepted":[-6,"11:30"],"started":[-5,"10:02"],"report":{"at":[-5,"11:05"],"memo":"싱크대 수전을 교체하고 냉·온수 연결을 확인했습니다.","parts":"원홀 수전 1개"}},
  {"id":"task-29","title":"에어컨 가스 충전","work":"repair","status":"COMPLETED","tech":"leeMinjun","day":-5,"start":"15:00","minutes":60,"customer":"parkJihun","price":80000,"payment":"카드 결제","by":"kimUnyeong","created":[-7,"13:00"],"assigned":[-7,"13:05"],"accepted":[-7,"16:00"],"started":[-5,"15:03"],"report":{"at":[-5,"16:02"],"memo":"냉매 압력을 측정하고 가스를 보충했습니다.","parts":"R410A 냉매 1kg"}},
  {"id":"task-30","title":"벽걸이 에어컨 설치","work":"install","status":"COMPLETED","tech":"parkSeoyeon","day":-8,"start":"13:00","minutes":120,"customer":"munTaeyang","price":250000,"payment":"카드 결제","by":"kimUnyeong","created":[-12,"10:00"],"assigned":[-12,"10:05"],"accepted":[-11,"09:00"],"started":[-8,"13:04"],"report":{"at":[-8,"15:10"],"memo":"안방 벽걸이 에어컨을 설치하고 시운전을 마쳤습니다.","parts":"냉매 배관 4m"}},
  {"id":"task-31","title":"건조기 배기 점검","work":"inspect","status":"COMPLETED","tech":"parkSeoyeon","day":-12,"start":"10:00","minutes":60,"customer":"shinDongha","price":45000,"payment":"현장 결제","by":"parkSeojun","created":[-15,"10:00"],"assigned":[-15,"10:05"],"accepted":[-14,"09:00"],"started":[-12,"10:02"],"report":{"at":[-12,"10:58"],"memo":"배기 호스 막힘을 청소하고 건조 성능을 확인했습니다.","parts":""}},
  {"id":"task-32","title":"냉장고 설치","work":"install","status":"COMPLETED","tech":"parkSeoyeon","day":-21,"start":"14:00","minutes":90,"customer":"baeSujin","price":120000,"payment":"카드 결제","by":"kimUnyeong","created":[-25,"09:00"],"assigned":[-25,"09:05"],"accepted":[-24,"10:00"],"started":[-21,"14:03"],"report":{"at":[-21,"15:28"],"memo":"양문형 냉장고를 설치하고 수평과 급수를 확인했습니다.","parts":"급수 호스 3m"}},
  {"id":"task-33","title":"냉장고 소음 점검","work":"inspect","status":"COMPLETED","tech":"choiDonguk","day":-30,"start":"10:00","minutes":60,"customer":"kangDoyun","price":40000,"payment":"현장 결제","by":"kimUnyeong","created":[-33,"10:00"],"assigned":[-33,"10:05"],"accepted":[-32,"09:00"],"started":[-30,"10:02"],"report":{"at":[-30,"10:55"],"memo":"압축기 고정 볼트를 조이고 소음이 줄어든 것을 확인했습니다.","parts":""}},
  {"id":"demo-stale","title":"인덕션 교체","work":"install","status":"REGISTERED","minutes":120,"customer":"kimDohyun","price":200000,"payment":"현장 결제","by":"kimUnyeong","created":[-3,"10:00"]},
  {"id":"task-34","title":"배관 점검","work":"inspect","status":"REGISTERED","minutes":60,"customer":"seoJia","price":50000,"payment":"현장 결제","by":"kimUnyeong","created":[-2,"09:30"]},
  {"id":"demo-rejected","title":"세탁기 점검","work":"inspect","status":"REGISTERED","minutes":60,"customer":"parkMinji","price":50000,"payment":"현장 결제","by":"kimUnyeong","created":[-4,"11:00"],"rejection":{"by":"kimTaehun","reason":"일정 중복","assigned":[-2,"14:00"],"at":[-1,"15:15"]}},
  {"id":"task-35","title":"가스보일러 점검","work":"inspect","status":"REGISTERED","minutes":60,"customer":"songHayoon","price":60000,"payment":"계좌 이체","by":"parkSeojun","created":[-5,"10:00"],"rejection":{"by":"leeCheolho","reason":"이동 거리 초과","assigned":[-4,"09:00"],"at":[-3,"16:40"]}},
  {"id":"task-36","title":"에어컨 배관 청소","work":"repair","status":"REGISTERED","minutes":90,"customer":"ohYejin","price":90000,"payment":"현장 결제","by":"kimUnyeong","created":[-3,"13:00"],"rejection":{"by":"hongGildong","reason":"부품 수급 지연","assigned":[-3,"13:10"],"at":[-2,"10:05"]}},
  {"id":"task-37","title":"욕실 수전 교체","work":"repair","status":"REGISTERED","tech":"parkSeoyeon","minutes":60,"customer":"leeSeoyoung","price":70000,"payment":"현장 결제","by":"kimUnyeong","created":[-1,"14:00"]},
  {"id":"task-38","title":"주방 후드 설치","work":"install","status":"REGISTERED","tech":"kimMinsu","minutes":120,"customer":"hanJiwon","price":150000,"payment":"카드 결제","by":"me","created":[-2,"11:00"],"photos":2},
  {"id":"task-39","title":"천장형 에어컨 점검","work":"inspect","status":"REGISTERED","day":3,"start":"10:00","minutes":120,"customer":"jeongMinho","price":130000,"payment":"계좌 이체","by":"parkSeojun","created":[-1,"10:30"]},
  {"id":"task-40","title":"전기 콘센트 수리","work":"repair","status":"REGISTERED","minutes":60,"customer":"kwonSoyeon","price":50000,"payment":"현장 결제","by":"kimUnyeong","created":[-5,"15:00"]},
  {"id":"task-41","title":"음식물 처리기 설치","work":"install","status":"REGISTERED","minutes":90,"customer":"yunSeoa","price":160000,"payment":"카드 결제","by":"kimUnyeong","created":[-1,"18:00"]},
  {"id":"task-42","title":"정수기 필터 교체","work":"repair","status":"CANCELED","minutes":60,"customer":"hanSohui","price":30000,"payment":"현장 결제","by":"kimUnyeong","created":[-1,"11:20"],"cancellation":{"reason":"고객 요청","at":[0,"08:10"],"by":"kimUnyeong"}},
  {"id":"task-43","title":"에어컨 철거","work":"install","status":"CANCELED","tech":"kimMinsu","day":1,"start":"08:00","minutes":60,"customer":"kangDoyun","price":70000,"payment":"현장 결제","by":"parkSeojun","created":[-4,"10:00"],"assigned":[-4,"10:05"],"accepted":[-3,"09:00"],"cancellation":{"reason":"중복 등록","at":[-2,"17:30"],"by":"parkSeojun"}}
];

const root = new URL('../', import.meta.url);
let serverEnv = {};
try {
  const text = await readFile(new URL('../server/.env', root), 'utf8');
  serverEnv = Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(AUTH_JWT_SECRET|AUTH_JWT_ISSUER)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const secret = process.env.AUTH_JWT_SECRET ?? serverEnv.AUTH_JWT_SECRET ?? 'local-only-secret-key-with-at-least-32-bytes';
const issuer = process.env.AUTH_JWT_ISSUER ?? serverEnv.AUTH_JWT_ISSUER ?? 'orbit';
const apiBase = process.env.API_BASE ?? 'http://localhost:8080';
const dbHost = process.env.DATABASE_HOST ?? process.env.PGHOST ?? 'localhost';
if (!['localhost', '127.0.0.1'].includes(dbHost)) {
  throw new Error(`Refusing destructive seed against non-local DB host: ${dbHost}`);
}
if (!['localhost', '127.0.0.1'].includes(new URL(apiBase).hostname)) {
  throw new Error('Refusing to seed a non-local API');
}
const db = new pg.Client({
  host: dbHost,
  port: Number(process.env.DATABASE_PORT ?? process.env.PGPORT ?? 54321),
  database: process.env.DATABASE_NAME ?? process.env.PGDATABASE ?? 'postgres',
  user: process.env.DATABASE_USER ?? process.env.PGUSER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? process.env.PGPASSWORD ?? 'postgres',
});
const now = Date.now();
const today = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
const midnight = Date.parse(`${today}T00:00:00+09:00`);
const scheduled = (day, time) => {
  const [hour, minute] = time.split(':').map(Number);
  return new Date(midnight + (day * 1440 + hour * 60 + minute) * 60000).toISOString();
};
// Historical events never lie in the future, even if seeded before the morning shift.
const eventAt = ([day, time]) => new Date(Math.min(Date.parse(scheduled(day, time)), now - 60000)).toISOString();
const tokens = {};
const ids = {
  organizationIds: {}, accountIds: {}, membershipIds: {}, technicianIds: {},
  categoryIds: { staff: {}, technician: {}, work: {} }, workIds: {},
  pendingParticipationRequestIds: {}, newAccountIds: [],
};
function token(accountId) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: 'HS256' })}.${encode({
    iss: issuer, sub: String(accountId), jti: randomUUID(), iat, exp: iat + 86400, token_use: 'access',
  })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}
async function api(person, method, path, body) {
  const response = await fetch(`${apiBase}/api/v1${path}`, {
    method, headers: { Authorization: `Bearer ${tokens[person]}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
  const payload = text ? JSON.parse(text) : null;
  if (payload?.success === false) throw new Error(`${method} ${path}: ${text}`);
  return payload?.result;
}
async function flushRedis() {
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: 6379 });
    let reply = '';
    socket.setTimeout(5000, () => socket.destroy(new Error('Redis FLUSHDB timed out')));
    socket.on('error', reject);
    socket.on('connect', () => socket.write('*1\r\n$7\r\nFLUSHDB\r\n'));
    socket.on('data', chunk => {
      reply += chunk.toString();
      if (!reply.includes('\r\n')) return;
      socket.end();
      if (reply === '+OK\r\n') resolve();
      else reject(new Error(`Redis FLUSHDB failed: ${reply.trim()}`));
    });
    socket.on('end', () => { if (!reply.includes('\r\n')) reject(new Error('Redis closed without a response')); });
  });
}
async function account(name, signup = true) {
  const { rows: [row] } = await db.query('INSERT INTO accounts (registered_at) VALUES (now()) RETURNING id');
  const id = Number(row.id);
  await db.query("INSERT INTO oauth_credentials (account_id, provider, oauth_uid) VALUES ($1, 'KAKAO', $2)", [id, `dev-${id}`]);
  ids.accountIds[name] = id;
  tokens[name] = token(id);
  if (signup) {
    await api(name, 'PUT', `/profiles/${id}`, { name, phoneNumber: `010${String(id).padStart(8, '0')}` });
    await api(name, 'POST', `/profiles/${id}/terms-agreements`, { serviceTerms: true, privacyPolicy: true, marketing: false });
  }
  return id;
}
async function join(name, type, org, owner, channel = 'COMPANY_CODE', approve = true) {
  const request = await api(name, 'POST', '/participation-requests', {
    companyCode: org.companyCode, desiredType: type, requestChannel: channel,
  });
  if (approve) {
    const approval = await api(owner, 'POST', `/organizations/${org.organizationId}/participation-requests/approvals`, {
      approvals: [{ requestId: request.requestId, confirmedType: type }],
    });
    if (approval.results[0].outcome !== 'APPROVED') throw new Error(JSON.stringify(approval));
  } else ids.pendingParticipationRequestIds[name] = request.requestId;
}
const staffCategories = {
  오르빗: '관리자', 김운영: '배차 담당', 박서준: '배차 담당', 이지은: '사무 지원', 송지환: '배차 담당', 양서희: '사무 지원',
};
const technicianCategories = {
  김민수: '전문 기사', 김민준: '설치 기사', 이민준: 'A/S 기사', 홍길동: '설치 기사',
  김태훈: '전기 기사', 박서연: '설치 기사', 이철호: '설치 기사', 이준혁: '전기 기사', 최동욱: 'A/S 기사',
};
const payments = { '현장 결제': 'ON_SITE_CASH', '계좌 이체': 'BANK_TRANSFER', '카드 결제': 'ON_SITE_CARD' };
const actualPayments = { '현장 결제': 'CASH', '계좌 이체': 'BANK_TRANSFER', '카드 결제': 'CREDIT_CARD' };
const workNames = { install: '설치', inspect: '점검', repair: '수리' };
const rejectionReasons = {
  '일정 중복': ['SCHEDULE_CONFLICT', null, '일정이 맞지 않습니다'],
  '이동 거리 초과': ['LOCATION_TOO_FAR', null, '작업 위치가 너무 멉니다'],
};
async function officeNotification(spec, workId, orgId, type, at, reason) {
  const bracket = `[${spec.title}]`;
  const message = type === 'WORK_ACCEPTED' ? `담당 기사가 ${bracket} 작업을 수락했습니다.`
    : type === 'WORK_REJECTED' ? `담당 기사가 ${bracket} 작업을 거절했습니다. 사유: ${reason}`
      : `${bracket} 완료 보고가 제출되었습니다.`;
  // notifications.member_id is the recipient ACCOUNT id, not staff membership id.
  await db.query(`INSERT INTO notifications
    (member_id, company_id, type, work_id, message, notified_at, status, read_at, is_hidden, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,'READ',$6,false,$6,$6)`,
  [ids.accountIds[PEOPLE[spec.by]], orgId, type, workId, message, at]);
}
async function rejectWork(spec, rejection, workId, orgId) {
  const [code, note, label] = rejectionReasons[rejection.reason] ?? ['OTHER', rejection.reason, rejection.reason];
  const at = eventAt(rejection.at);
  await db.query(`UPDATE work_assignments SET result='REJECTED', decided_at=$2,
    rejection_reason=$3, rejection_note=$4, ended_at=NULL, ended_by=NULL, end_reason=NULL, updated_at=$2
    WHERE work_id=$1 AND result='PENDING'`, [workId, at, code, note]);
  // WorkMapper stores the last shown schedule in these columns. The REGISTERED
  // status clears the active domain schedule, while preserving list/backlog history.
  await db.query("UPDATE work SET status='REGISTERED', version=version+1, updated_at=$2 WHERE id=$1", [workId, at]);
  await db.query('UPDATE notifications SET is_hidden=true WHERE member_id=$1 AND work_id=$2',
    [ids.accountIds[PEOPLE[rejection.by]], workId]);
  await officeNotification(spec, workId, orgId, 'WORK_REJECTED', at, label);
}
async function seedWork(spec, orgId) {
  const registrar = PEOPLE[spec.by];
  const base = `/organizations/${orgId}/works`;
  const rejection = spec.pastRejection ?? spec.rejection;
  const technician = rejection?.by ?? spec.tech;
  const initialTime = spec.start ? scheduled(spec.day ?? 0, spec.start) : rejection ? scheduled(0, '09:00') : undefined;
  const schedule = technician || initialTime ? {
    technicianId: technician ? ids.technicianIds[PEOPLE[technician]] : undefined,
    startTime: initialTime, expectedDurationMinutes: spec.minutes, conflictConfirmed: true,
  } : undefined;
  const c = CUSTOMERS[spec.customer];
  const created = await api(registrar, 'POST', base, {
    name: spec.title,
    customer: c ? { name: c[0], phone: c[1], postalCode: c[2], address: c[3], addressDetail: c[4] } : undefined,
    payment: { fee: spec.price, method: payments[spec.payment] },
    sitePhotoIds: Array.from({ length: spec.photos ?? 0 }, (_, i) => `https://placehold.co/600x360?text=Site+${i + 1}`),
    schedule,
  });
  if (!created.applied || !created.workId) throw new Error(`Work was not created: ${JSON.stringify(created)}`);
  const workId = created.workId;
  ids.workIds[spec.id] = workId;
  // No API accepts historical event times. Backdate registration and assignment
  // together, preserving domain chronological invariants and meaningful history.
  await db.query(`UPDATE work SET registered_at=$2, created_at=$2, updated_at=$2,
    job_type_id=$3, version=version+1 WHERE id=$1`,
  [workId, eventAt(spec.created), ids.categoryIds.work[workNames[spec.work]] ?? null]);
  if (schedule?.technicianId && schedule.startTime) {
    const assigned = eventAt(rejection?.assigned ?? spec.assigned ?? spec.created);
    await db.query('UPDATE work_assignments SET assigned_at=$2, created_at=$2, updated_at=$2 WHERE work_id=$1', [workId, assigned]);
  }
  if (rejection) {
    await rejectWork(spec, rejection, workId, orgId);
    if (spec.pastRejection) {
      const detail = await api(registrar, 'GET', `${base}/${workId}`);
      const result = await api(registrar, 'PUT', `${base}/${workId}/assignment`, {
        technicianId: ids.technicianIds[PEOPLE[spec.tech]], startTime: initialTime,
        expectedDurationMinutes: spec.minutes, conflictConfirmed: true, expectedVersion: detail.version,
      });
      if (!result.applied) throw new Error('Reassignment was not applied');
      await db.query(`UPDATE work_assignments SET assigned_at=$2, created_at=$2, updated_at=$2
        WHERE work_id=$1 AND result='PENDING'`, [workId, eventAt(spec.assigned)]);
    }
  }
  if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(spec.status) || (spec.status === 'CANCELED' && spec.accepted)) {
    const acceptedAt = eventAt(spec.accepted);
    await db.query(`UPDATE work_assignments SET result='ACCEPTED', decided_at=$2,
      ended_at=NULL, ended_by=NULL, end_reason=NULL, rejection_reason=NULL, rejection_note=NULL, updated_at=$2
      WHERE work_id=$1 AND result='PENDING'`, [workId, acceptedAt]);
    await db.query("UPDATE work SET status='ACCEPTED', version=version+1, updated_at=$2 WHERE id=$1", [workId, acceptedAt]);
    await officeNotification(spec, workId, orgId, 'WORK_ACCEPTED', acceptedAt);
  }
  if (spec.started) {
    await db.query("UPDATE work SET status='IN_PROGRESS', started_at=$2, updated_at=$2, version=version+1 WHERE id=$1",
      [workId, eventAt(spec.started)]);
  }
  if (spec.report) {
    const at = eventAt(spec.report.at);
    await db.query(`UPDATE work SET status='COMPLETED', completed_at=$2, used_parts=$3, work_note=$4,
      actual_fee=$5, actual_payment_method=$6, updated_at=$2, version=version+1 WHERE id=$1`,
    [workId, at, spec.report.parts || null, spec.report.memo, spec.price, actualPayments[spec.payment]]);
    for (const kind of ['BEFORE', 'AFTER']) {
      await db.query(`INSERT INTO work_execution_images (work_id,image_type,image_url,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$4)`, [workId, kind, `https://placehold.co/600x360?text=${kind}`, at]);
    }
    await officeNotification(spec, workId, orgId, 'COMPLETION_REPORT_SUBMITTED', at);
  }
  if (spec.cancellation) {
    await api(registrar, 'POST', `${base}/${workId}/cancellation`, {
      reason: spec.cancellation.reason === '고객 요청' ? 'CUSTOMER_REQUEST' : 'DUPLICATE_REGISTRATION',
    });
  }
}
try {
  await db.connect();
  const { rows } = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  if (rows.length) {
    const tables = rows.map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`).join(', ');
    await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  }
  await flushRedis();
  for (const name of Object.values(PEOPLE)) await account(name);
  await account('협력관리자');
  for (let i = 1; i <= 5; i++) ids.newAccountIds.push(await account(`신규${i}`, false));
  const primary = await api('오르빗', 'POST', '/organizations', { name: 'OO건설', industry: 'HVAC' });
  const orgId = primary.organizationId;
  ids.organizationIds['OO건설'] = orgId;
  for (const [name] of Object.entries(staffCategories)) if (name !== '오르빗') await join(name, 'STAFF', primary, '오르빗');
  for (const name of Object.keys(technicianCategories)) await join(name, 'TECHNICIAN', primary, '오르빗');
  for (const [kind, names, endpoint] of [
    ['staff', ['관리자', '배차 담당', '사무 지원', '현장 담당'], 'staff-categories'],
    ['technician', ['전문 기사', '설치 기사', 'A/S 기사', '전기 기사', '보조 기사'], 'technician-categories'],
    ['work', ['설치', '점검', '수리', '세척'], 'work-types'],
  ]) {
    for (const name of names) {
      const color = kind === 'work' ? { 설치: '#8B5CF6', 점검: '#3B82F6', 수리: '#EAB308', 세척: '#22C55E' }[name] : '#3B82F6';
      const result = await api('오르빗', 'POST', `/organizations/${orgId}/${endpoint}`, { name, color });
      ids.categoryIds[kind][name] = result.categoryId ?? result.workTypeId;
    }
  }
  const { participants } = await api('오르빗', 'GET', `/organizations/${orgId}/participants`);
  for (const member of participants) {
    const technician = member.role === 'TECHNICIAN';
    (technician ? ids.technicianIds : ids.membershipIds)[member.name] = member.memberId;
    const category = (technician ? technicianCategories : staffCategories)[member.name];
    await api('오르빗', 'PUT', `/organizations/${orgId}/${technician ? 'technicians' : 'staff-memberships'}/${member.memberId}/category`, {
      categoryId: ids.categoryIds[technician ? 'technician' : 'staff'][category],
    });
  }
  const pending = [['정하늘','TECHNICIAN'],['오세훈','TECHNICIAN'],['한지우','STAFF'],['윤도현','TECHNICIAN'],['서민재','STAFF'],['장예린','TECHNICIAN'],['임채원','STAFF']];
  for (const [i, [name, type]] of pending.entries()) {
    await account(name);
    await join(name, type, primary, '오르빗', ['COMPANY_CODE', 'JOIN_LINK', 'QR_CODE'][i % 3], false);
  }
  const partner = await api('협력관리자', 'POST', '/organizations', { name: '협력 발주사', industry: 'FACILITY_MANAGEMENT' });
  ids.organizationIds['협력 발주사'] = partner.organizationId;
  await join('오르빗', 'STAFF', partner, '협력관리자');
  // Keep the no-report demo request-free. A different overdue work carries the
  // historical request, old enough that its request button is immediately usable.
  const reportHistorySpec = SPECS.find(spec => spec.id === 'demo-delayed');
  const endAt = spec => Date.parse(scheduled(spec.day, spec.start)) + spec.minutes * 60000;
  if (endAt(reportHistorySpec) + 32 * 60000 >= now) {
    // Early-morning seeds still need a genuinely overdue historical request.
    reportHistorySpec.day = -1;
    reportHistorySpec.started = [-1, '09:41'];
  }
  for (const spec of SPECS) await seedWork(spec, orgId);
  // Deactivate only after creating the technician's historical completed work.
  await api('오르빗', 'POST', `/organizations/${orgId}/technicians/${ids.technicianIds['최동욱']}/deactivation`);
  const reportHistoryId = ids.workIds[reportHistorySpec.id];
  const requestedAt = new Date(endAt(reportHistorySpec) + 60000).toISOString();
  await api('오르빗', 'POST', `/organizations/${orgId}/works/${reportHistoryId}/completion-report-requests`);
  // The HTTP API uses the current clock; backdate the request and its generated
  // notification together, after the scheduled end and over 30 minutes ago.
  await db.query(`UPDATE work_completion_report_requests
    SET requested_at=$2, created_at=$2, updated_at=$2 WHERE work_id=$1`, [reportHistoryId, requestedAt]);
  await db.query(`UPDATE notifications SET notified_at=$2, created_at=$2, updated_at=$2
    WHERE work_id=$1 AND type='COMPLETION_REPORT_REQUESTED'`, [reportHistoryId, requestedAt]);
  await db.query('UPDATE work SET updated_at=$2, version=version+1 WHERE id=$1', [reportHistoryId, requestedAt]);
  // Leave two office notifications unread per registrar; server-generated technician notifications stay untouched.
  await db.query(`UPDATE notifications SET status='UNREAD', read_at=NULL WHERE id IN (
    SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY member_id ORDER BY notified_at DESC,id DESC) AS n
      FROM notifications WHERE type IN ('WORK_ACCEPTED','WORK_REJECTED','COMPLETION_REPORT_SUBMITTED')) ranked WHERE n<=2)`);
  await writeFile(new URL('.env.development.local', root), [
    `VITE_DEV_AUTH_JWT_SECRET=${secret}`, `VITE_DEV_AUTH_JWT_ISSUER=${issuer}`,
    `VITE_DEV_OWNER_ACCOUNT_ID=${ids.accountIds['오르빗']}`, `VITE_DEV_STAFF_ACCOUNT_ID=${ids.accountIds['김운영']}`,
    `VITE_DEV_NEW_ACCOUNT_IDS=${ids.newAccountIds.join(',')}`, '',
  ].join('\n'), { mode: 0o600 });
  await writeFile(new URL('.dev-seed.json', root), `${JSON.stringify(ids, null, 2)}\n`, { mode: 0o600 });
  console.log(`Seeded ${Object.keys(ids.accountIds).length} accounts, 2 organizations, ${SPECS.length} works, 7 pending requests (${today} Asia/Seoul).`);
  console.log('Wrote .env.development.local and .dev-seed.json. Local database and Redis were reset.');
} finally {
  await db.end();
}
