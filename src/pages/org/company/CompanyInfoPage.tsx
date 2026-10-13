import { useMemo, useState } from 'react';

import { Button, Field, TextField } from '@/design-system';
import { INDUSTRIES } from '@/mocks/constants';
import { useCurrentCompany } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import type { Company, ID } from '@/mocks/types';

import { ListSelect, type ListSelectOption } from '../components/ListSelect';
import styles from './CompanyInfoPage.module.css';

const INDUSTRY_OPTIONS: ListSelectOption<string>[] = INDUSTRIES.map((name) => ({ value: name, label: name }));

/**
 * 이 화면에서 저장한 발주사 명(발주사별). 시안 '입력 전'(570:2409)은 발주사 명 칸이 비어 있으므로
 * 처음에는 빈 칸으로 시작하고, 여기서 저장한 뒤에는 그 이름을 보여 준다. 새로고침하면 시드와 함께 초기화된다.
 */
const savedNames = new Map<ID, string>();

/**
 * 조직 설정 > 발주사 정보(Figma 입력 전 570:2409 · 입력 중 1908:13162 · 입력 후 1951:23061).
 * 기본정보 카드: 발주사 명 입력, 업종 선택. 값이 바뀌면 '저장' 활성 → updateCompany, '취소' → 원래 값.
 */
export default function CompanyInfoPage() {
  const company = useCurrentCompany();
  if (!company) return null;
  // 발주사를 바꾸면(?companies=2) 입력 상태를 새로 시작한다.
  return <CompanyInfoForm key={company.id} company={company} />;
}

function CompanyInfoForm({ company }: { company: Company }) {
  const updateCompany = useAppStore((s) => s.updateCompany);
  const [baseName, setBaseName] = useState(() => savedNames.get(company.id) ?? '');
  const [name, setName] = useState(baseName);
  const [industry, setIndustry] = useState(company.industry);

  const options = useMemo(
    () =>
      !company.industry || INDUSTRY_OPTIONS.some((o) => o.value === company.industry)
        ? INDUSTRY_OPTIONS
        : [...INDUSTRY_OPTIONS, { value: company.industry, label: company.industry }],
    [company.industry],
  );

  const dirty = name !== baseName || industry !== company.industry;

  const save = () => {
    if (!dirty) return;
    const trimmed = name.trim();
    updateCompany({ name: trimmed || company.name, industry });
    const nextBase = trimmed || baseName;
    if (trimmed) savedNames.set(company.id, trimmed);
    setBaseName(nextBase);
    setName(nextBase);
  };

  const cancel = () => {
    setName(baseName);
    setIndustry(company.industry);
  };

  return (
    <section className={styles.card} aria-labelledby="company-basic-title">
      <div className={styles.body}>
        <div className={styles.fields}>
          <h2 id="company-basic-title" className={`t-body-xxl-bold ${styles.heading}`}>
            기본정보
          </h2>
          <Field label="발주사 명" labelStyle="large" htmlFor="company-name">
            <TextField
              id="company-name"
              appearance="large"
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="업종" labelStyle="large" htmlFor="company-industry">
            <ListSelect
              id="company-industry"
              variant="industry"
              value={industry || null}
              options={options}
              onChange={setIndustry}
            />
          </Field>
        </div>
        <div className={styles.actions}>
          <Button size="lg" disabled={!dirty} onClick={save} style={{ width: 173 }}>
            저장
          </Button>
          <Button size="lg" variant="secondary" onClick={cancel} style={{ width: 97 }}>
            취소
          </Button>
        </div>
      </div>
    </section>
  );
}
