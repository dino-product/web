import { Navigate, Route, Routes } from 'react-router-dom';

import TimetablePage from './TimetablePage';

/**
 * 타임테이블 섹션 진입점(/timetable/*). 화면은 /timetable 하나이고 상태 전환은 화면 상태·쿼리로 한다.
 * - ?mode=edit 편집 모드, &task=<id> 해당 작업 선택(작업 목록 '배정하기')
 * - 상태: 기사 0명·대기함 비어 있음(서버 데이터 기준), 네트워크 연결 실패(서버에 닿지 못함)
 */
export default function TimetableSection() {
  return (
    <Routes>
      <Route index element={<TimetablePage />} />
      <Route path="*" element={<Navigate to="/timetable" replace />} />
    </Routes>
  );
}
