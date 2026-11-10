import { useState } from 'react';

/**
 * 이름·연락처 입력 규칙. 서버 도메인 규칙(PersonName·PhoneNumber)과 같다.
 * - 이름: 앞뒤 공백을 지우고 한글 음절·영문만 2~20자
 * - 연락처: 숫자만 남겨 010으로 시작하는 11자리
 */
const NAME_PATTERN = /^[가-힣A-Za-z]{2,20}$/;
const PHONE_PATTERN = /^010\d{8}$/;

/** 이름 오류 문구. 통과하면 null */
export function profileNameError(name: string): string | null {
  const value = name.trim();
  if (!value) return '이름을 입력해주세요';
  return NAME_PATTERN.test(value) ? null : '이름은 한글·영문 2~20자로 입력해주세요';
}

/** 연락처 오류 문구. 통과하면 null */
export function profilePhoneError(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '연락처를 입력해주세요';
  return PHONE_PATTERN.test(digits) ? null : '010으로 시작하는 휴대전화 번호 11자리를 입력해주세요';
}

type ProfileField = 'name' | 'phone';

/**
 * 프로필 입력(회원가입 프로필 등록·마이페이지)의 헬퍼 텍스트 상태.
 * 입력칸을 벗어났거나(blur) 제출을 눌렀을 때부터 그 칸의 오류를 보이고, 이후에는 입력에 따라 바로 갱신한다.
 */
export function useProfileValidation(name: string, phone: string) {
  const [touched, setTouched] = useState<Record<ProfileField, boolean>>({ name: false, phone: false });
  const nameError = profileNameError(name);
  const phoneError = profilePhoneError(phone);
  return {
    nameError: touched.name ? nameError : null,
    phoneError: touched.phone ? phoneError : null,
    touch: (field: ProfileField) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true })),
    /** 제출 시 두 칸의 오류를 모두 보이고 첫 오류 칸을 돌려준다. 통과하면 null */
    submit: (): ProfileField | null => {
      setTouched({ name: true, phone: true });
      if (nameError) return 'name';
      if (phoneError) return 'phone';
      return null;
    },
  };
}
