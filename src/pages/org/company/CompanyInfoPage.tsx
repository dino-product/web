import { useMemo, useState } from 'react';

import { Button, Field, TextField } from '@/design-system';
import { INDUSTRIES } from '@/data/constants';
import { useCurrentCompany } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import type { Company } from '@/data/types';

import { ListSelect, type ListSelectOption } from '../components/ListSelect';
import styles from './CompanyInfoPage.module.css';

const INDUSTRY_OPTIONS: ListSelectOption<string>[] = INDUSTRIES.map((name) => ({ value: name, label: name }));

/**
 * 조직 설정 > 발주사 정보(Figma 입력 전 570:2409 · 입력 중 1908:13162 · 입력 후 1951:23061).
 * 기본정보 카드: 발주사 명 입력, 업종 선택. 값이 바뀌면 '저장' 활성 → updateCompany(PUT /organizations/{id}), '취소' → 원래 값.
 * 원래 값은 서버의 발주사명·업종(GET /organizations/{id})이다.
 */
export default function CompanyInfoPage() {
  const company = useCurrentCompany();
  if (!company) return null;
  // 발주사를 바꾸거나 서버 값이 새로 오면(조회·저장 뒤) 입력 상태를 새로 시작한다.
  return <CompanyInfoForm key={`${company.id}:${company.name}:${company.industry}`} company={company} />;
}

function CompanyInfoForm({ company }: { company: Company }) {
  const updateCompany = useAppStore((s) => s.updateCompany);
  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry);

  const options = useMemo(
    () =>
      !company.industry || INDUSTRY_OPTIONS.some((o) => o.value === company.industry)
        ? INDUSTRY_OPTIONS
        : [...INDUSTRY_OPTIONS, { value: company.industry, label: company.industry }],
    [company.industry],
  );

  const dirty = name !== company.name || industry !== company.industry;

  const save = () => {
    if (!dirty) return;
    void updateCompany({ name: name.trim() || company.name, industry });
  };

  const cancel = () => {
    setName(company.name);
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
