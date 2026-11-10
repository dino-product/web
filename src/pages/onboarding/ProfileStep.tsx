import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Checkbox, Field, Icon, TextField } from '@/design-system';
import { useProfileValidation } from '@/features/profile/useProfileValidation';
import { formatPhone } from '@/lib/format';
import { useAppStore } from '@/data/store';

import { OnboardingStep } from './OnboardingStep';
import styles from './StepFields.module.css';
import TermsLink from './TermsLink';

/**
 * 온보딩 1 프로필 등록(Figma 1453:12438).
 * - 이름·연락처·이용약관(약관 동의 결과로 체크)이 모두 맞아야 '다음' → registerProfile → /onboarding/company.
 *   이름(한글·영문 2~20자)·연락처(010 11자리)가 서버 규칙에 맞지 않으면 빨간 테두리와 칸 아래 오류 헬퍼 텍스트를 보이고
 *   첫 오류 칸으로 포커스를 옮긴다(입력칸을 벗어날 때도 검사, 시안 없음, 요청으로 추가).
 *   이용약관이 비어 있으면 화면 변화 없이 체크박스로 포커스만 옮긴다.
 * - '취소' → 로그아웃 → /login.
 * - 이용약관 행 오른쪽 화살표는 서비스 이용약관 본문(서버 GET /terms의 주소)을 약관 본문 모달로 연다.
 * - 프로필 사진 업로드 요소(1453:12460)는 이 프레임 밖(아래 244px)에 따로 놓인 요소라 폼에 넣지 않는다.
 */
export default function ProfileStep() {
  const navigate = useNavigate();
  const termsAgreed = useAppStore((s) => s.session.termsAgreed);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(termsAgreed);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const validation = useProfileValidation(name, phone);

  const handleSubmit = async () => {
    const invalidField = validation.submit();
    if (invalidField) {
      (invalidField === 'name' ? nameRef : phoneRef).current?.focus();
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
      <Field
        label="이름"
        hint="필수 항목"
        labelStyle="caption"
        htmlFor="onboarding-name"
        error={validation.nameError}
        errorId="onboarding-name-error"
      >
        <TextField
          ref={nameRef}
          id="onboarding-name"
          appearance="filled"
          className={styles.input}
          value={name}
          invalid={!!validation.nameError}
          aria-invalid={validation.nameError ? true : undefined}
          aria-describedby={validation.nameError ? 'onboarding-name-error' : undefined}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => validation.touch('name')}
          autoComplete="name"
        />
      </Field>
      <Field
        label="연락처"
        hint="필수 항목"
        labelStyle="caption"
        htmlFor="onboarding-phone"
        error={validation.phoneError}
        errorId="onboarding-phone-error"
      >
        <TextField
          ref={phoneRef}
          id="onboarding-phone"
          appearance="filled"
          className={styles.input}
          value={phone}
          invalid={!!validation.phoneError}
          aria-invalid={validation.phoneError ? true : undefined}
          aria-describedby={validation.phoneError ? 'onboarding-phone-error' : undefined}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          onBlur={() => validation.touch('phone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
      </Field>
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
