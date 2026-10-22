import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Field, SelectField, type SelectFieldOption, TextField } from '@/design-system';
import { INDUSTRIES } from '@/data/constants';
import { useAppStore } from '@/data/store';

import companyIllustration from './assets/company-illustration.png';
import dot4 from './assets/dot-4.svg';
import dot7 from './assets/dot-7.svg';
import dot10 from './assets/dot-10.svg';
import dot18 from './assets/dot-18.svg';
import styles from './CompanyStep.module.css';
import { OnboardingStep } from './OnboardingStep';
import fieldStyles from './StepFields.module.css';

const INDUSTRY_OPTIONS: SelectFieldOption<string>[] = INDUSTRIES.map((industry) => ({ value: industry, label: industry }));

const INDUSTRY_SELECT_ID = 'onboarding-industry';

/**
 * 온보딩 2 발주사 생성(Figma 1453:14801).
 * - 발주사 명·업종이 모두 있어야 '생성' → createCompany → /onboarding/types. 비어 있으면 빈 칸으로 포커스만 옮긴다.
 * - '건너뛰기' → /onboarding/types.
 * - 업종 칸의 '건설'은 시안 안내 글자(Gray500)라 placeholder로 두고, 선택지는 업종 목록(INDUSTRIES)이다.
 */
export default function CompanyStep() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!industry) {
      document.getElementById(INDUSTRY_SELECT_ID)?.focus();
      return;
    }
    if (await useAppStore.getState().createCompany({ name: name.trim(), industry })) navigate('/onboarding/types');
  };

  return (
    <OnboardingStep
      step={2}
      title="발주사 생성"
      subtitle="서비스를 시작하기 위해 발주사 정보를 입력해주세요"
      cardTop={230}
      introTop={131}
      secondaryLabel="건너뛰기"
      onSecondary={() => navigate('/onboarding/types')}
      primaryLabel="생성"
      onSubmit={handleSubmit}
      secondaryWidth={55}
      primaryLabelWidth={28}
      illustration={
        <>
          <img src={companyIllustration} alt="" className={styles.illustration} />
          <img src={dot7} alt="" className={clsx(styles.dot, styles.dot7)} />
          <img src={dot18} alt="" className={clsx(styles.dot, styles.dot18)} />
          <img src={dot10} alt="" className={clsx(styles.dot, styles.dot10)} />
          <img src={dot4} alt="" className={clsx(styles.dot, styles.dot4)} />
        </>
      }
    >
      <div className={fieldStyles.fieldGroup}>
        <Field label="발주사 명" hint="필수 항목" labelStyle="caption" htmlFor="onboarding-company-name">
          <TextField
            ref={nameRef}
            id="onboarding-company-name"
            appearance="filled"
            className={fieldStyles.input}
            placeholder="예) OO건설, OO설비"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="organization"
          />
        </Field>
        <p className={clsx('t-caption-s-medium', fieldStyles.hint)}>법인명 또는 사업장명을 정확히 입력하세요</p>
      </div>
      <div className={fieldStyles.fieldGroup}>
        <Field label="업종" hint="필수 항목" labelStyle="caption" htmlFor={INDUSTRY_SELECT_ID}>
          <SelectField
            id={INDUSTRY_SELECT_ID}
            appearance="modal"
            className={fieldStyles.select}
            value={industry}
            options={INDUSTRY_OPTIONS}
            onChange={setIndustry}
            placeholder="건설"
          />
        </Field>
        <p className={clsx('t-caption-s-medium', fieldStyles.hint)}>주요 사업 분야를 선택하세요</p>
      </div>
    </OnboardingStep>
  );
}
