import { createContext } from 'react';

import type { IsoDate } from '@/mocks/types';

/**
 * 새 작업 등록 모달이 시작 시간을 고른 작업에 붙일 날짜.
 * 타임테이블은 보고 있는 날짜를 넣어 주고, 다른 화면(작업 목록 등)에서는 값이 없어 오늘 날짜를 쓴다.
 * 모달 props 시그니처를 바꾸지 않으려고 컨텍스트로 전달한다.
 */
export const TaskRegisterDateContext = createContext<IsoDate | null>(null);
