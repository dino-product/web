import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Field, Icon, TextField } from '@/design-system';
import { useProfileValidation } from '@/features/profile/useProfileValidation';
import { formatPhone } from '@/lib/format';
import { useCurrentUser } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { COMPANY_ROLE_LABEL } from '@/data/types';

import styles from './MyPage.module.css';

/**
 * 마이페이지(Figma 460:5226). 시안의 프로필 사진 원·사진 업로드(1802:6229, 463:5695)는 요청에 따라 그리지 않는다.
 * - 저장: 이름·연락처를 updateProfile로 반영(인사말·사이드바 이름이 바뀐다).
 *   형식이 틀리면 저장하지 않고 칸 아래 오류 헬퍼 텍스트를 보인다(입력칸을 벗어날 때도 검사).
 * - 알림센터 → /notifications, 로그아웃 → /login, 계정 탈퇴 → /mypage/withdraw
 */
export default function MyPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const memberships = useAppStore((s) => s.memberships);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const logout = useAppStore((s) => s.logout);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const validation = useProfileValidation(name, phone);

  const handleSave = () => {
    if (validation.submit()) return;
    updateProfile({ name, phone });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.page}>
      <h1 className={`t-title-s ${styles.title}`}>마이페이지</h1>
      <div className={styles.content}>
        <section className={styles.profileSection}>
          <p className={styles.greeting}>{user?.name ?? ''}님, 반가워요!</p>
          <div className={styles.profileCard}>
            <div className={styles.fields}>
              <Field
                label="이름"
                labelStyle="profile"
                htmlFor="mypage-name"
                error={validation.nameError}
                errorId="mypage-name-error"
              >
                <TextField
                  id="mypage-name"
                  appearance="profile"
                  value={name}
                  invalid={!!validation.nameError}
                  aria-invalid={validation.nameError ? true : undefined}
                  aria-describedby={validation.nameError ? 'mypage-name-error' : undefined}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => validation.touch('name')}
                  autoComplete="name"
                />
              </Field>
              <Field
                label="연락처"
                labelStyle="profile"
                htmlFor="mypage-phone"
                error={validation.phoneError}
                errorId="mypage-phone-error"
              >
                <TextField
                  id="mypage-phone"
                  appearance="profile"
                  value={phone}
                  invalid={!!validation.phoneError}
                  aria-invalid={validation.phoneError ? true : undefined}
                  aria-describedby={validation.phoneError ? 'mypage-phone-error' : undefined}
                  inputMode="tel"
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                  onBlur={() => validation.touch('phone')}
                  autoComplete="tel"
                />
              </Field>
            </div>
            <Button style={{ width: 173 }} onClick={handleSave}>
              저장
            </Button>
          </div>
        </section>

        <section className={styles.listSection}>
          <h2 className={`t-body-m-semibold ${styles.sectionTitle}`}>소속 발주사</h2>
          <ul className={styles.list}>
            {memberships.map((membership) => (
              <li key={membership.companyId} className={styles.companyRow}>
                <span className="t-body-s-medium">{membership.companyName}</span>
                <span className={`t-body-s-medium ${styles.roleChip}`}>{COMPANY_ROLE_LABEL[membership.role]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.listSection}>
          <h2 className={`t-body-m-semibold ${styles.sectionTitle}`}>알림 및 계정</h2>
          <ul className={styles.list}>
            <li>
              <button type="button" className={`${styles.linkRow} ${styles.linkRowFirst}`} onClick={() => navigate('/notifications')}>
                <span className="t-body-s-medium">알림센터</span>
                <Chevron />
              </button>
            </li>
            <li>
              <button type="button" className={`${styles.linkRow} ${styles.linkRowMiddle}`} onClick={handleLogout}>
                <span className="t-body-s-medium">로그아웃</span>
                <Chevron />
              </button>
            </li>
            <li>
              <button type="button" className={styles.linkRow} onClick={() => navigate('/mypage/withdraw')}>
                <span className={`t-body-s-medium ${styles.danger}`}>계정 탈퇴</span>
                <Chevron />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/** 목록 오른쪽 › (Figma Frame 2147239108, 36px 상자 · Gray500) */
function Chevron() {
  return (
    <span className={styles.chevron}>
      <Icon name="chevron-right" size={28} color="var(--color-gray-500)" />
    </span>
  );
}
