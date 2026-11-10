import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Checkbox, Field, Icon, TextField } from '@/design-system';
import { formatPhone } from '@/lib/format';
import { useAppStore } from '@/data/store';

import { OnboardingStep } from './OnboardingStep';
import styles from './StepFields.module.css';
import TermsLink from './TermsLink';

/** 휴대전화 번호 서버 규칙(PhoneNumber): 하이픈을 뺀 숫자가 010으로 시작하는 11자리 */
const MOBILE_PHONE_DIGITS = /^010\d{8}$/;
const PHONE_ERROR = '010으로 시작하는 휴대전화 번호 11자리를 입력해주세요';

/**
 * 온보딩 1 프로필 등록(Figma 1453:12438).
 * - 이름·연락처·이용약관(약관 동의 결과로 체크)이 모두 있어야 '다음' → registerProfile → /onboarding/company.
 *   비어 있으면 화면 변화 없이 빈 입력으로 포커스만 옮긴다(시안의 '다음'은 빈 폼에서도 같은 모양).
 *   연락처가 서버 규칙(010 11자리)에 맞지 않으면 빨간 테두리와 오류 문구를 띄운다(시안 없음, 요청으로 추가).
 * - '취소' → 로그아웃 → /login.
 * - 이용약관 행 오른쪽 화살표는 서비스 이용약관 본문(서버 GET /terms의 주소)을 약관 본문 모달로 연다.
 * - 프로필 사진 업로드 요소(1453:12460)는 이 프레임 밖(아래 244px)에 따로 놓인 요소라 폼에 넣지 않는다.
 */
export default function ProfileStep() {
  const navigate = useNavigate();
  const termsAgreed = useAppStore((s) => s.session.termsAgreed);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [agreed, setAgreed] = useState(termsAgreed);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!MOBILE_PHONE_DIGITS.test(phone.replace(/\D/g, ''))) {
      setPhoneInvalid(true);
      phoneRef.current?.focus();
      return;
    }
    if (!agreed) {
      termsRef.current?.focus();
      return;
    }
    const store = useAppStore.getState();
    if (!store.session.termsAgreed) store.agreeTerms(false);
    // 서버 규칙: 프로필 입력 → 필수 약관 동의 순서(registerProfile이 둘을 차례로 보낸다). 실패하면 이 화면에 남는다.
    if (await store.registerProfile({ name: name.trim(), phone })) navigate('/onboarding/company');
  };

  const handleCancel = () => {
    useAppStore.getState().logout();
    navigate('/login');
  };

  return (
    <OnboardingStep
      step={1}
      title="프로필 등록"
      subtitle="서비스를 시작하기 위해 기본 정보를 입력해주세요"
      cardTop={230}
      introTop={202}
      secondaryLabel="취소"
      onSecondary={handleCancel}
      primaryLabel="다음"
      onSubmit={handleSubmit}
      secondaryWidth={28}
      primaryLabelWidth={28}
    >
      <Field label="이름" hint="필수 항목" labelStyle="caption" htmlFor="onboarding-name">
        <TextField
          ref={nameRef}
          id="onboarding-name"
          appearance="filled"
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
      </Field>
      <div className={styles.fieldGroup}>
        <Field label="연락처" hint="필수 항목" labelStyle="caption" htmlFor="onboarding-phone">
          <TextField
            ref={phoneRef}
            id="onboarding-phone"
            appearance="filled"
            className={styles.input}
            value={phone}
            onChange={(event) => {
              setPhone(formatPhone(event.target.value));
              setPhoneInvalid(false);
            }}
            invalid={phoneInvalid}
            aria-invalid={phoneInvalid || undefined}
            aria-describedby={phoneInvalid ? 'onboarding-phone-error' : undefined}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        {phoneInvalid && (
          <p id="onboarding-phone-error" role="alert" className={clsx('t-caption-s-medium', styles.error)}>
            {PHONE_ERROR}
          </p>
        )}
      </div>
      <Field label="이용약관" hint="필수 항목" labelStyle="caption">
        <div className={styles.termsBox}>
          <div className={styles.termsRow}>
            <Checkbox
              ref={termsRef}
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              gap={5}
              className={styles.termsCheck}
              label="서비스 이용 약관에 동의합니다"
              labelClassName={clsx('t-caption-m-medium', styles.termsLabel)}
            />
            <TermsLink type="SERVICE" label="서비스 이용약관 보기">
              <Icon name="chevron-right" size={26} color="var(--color-gray-400)" />
            </TermsLink>
          </div>
        </div>
      </Field>
    </OnboardingStep>
  );
}
