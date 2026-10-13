import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar, Button, Field, Icon, TextField } from '@/design-system';
import { formatPhone } from '@/lib/format';
import { useCurrentUser } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import { COMPANY_ROLE_LABEL } from '@/mocks/types';

import styles from './MyPage.module.css';

/**
 * 마이페이지(Figma 460:5226). 프로필 사진 요소는 1802:6229(130px 원형).
 * - 사진 업로드: 파일 선택 → 미리보기(저장 전까지 화면에만 반영)
 * - 저장: 이름·연락처·사진을 updateProfile로 반영(인사말·사이드바 이름이 바뀐다)
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // 이름이 비면 사이드바·인사말이 깨지므로 반영하지 않는다(시안에 오류 상태 없음).
    if (!name.trim()) return;
    updateProfile({ name, phone, avatarUrl });
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
            <div className={styles.profileRow}>
              <div className={styles.photoColumn}>
                {avatarUrl ? (
                  <Avatar variant="image" size={130} src={avatarUrl} alt="프로필 사진" />
                ) : (
                  <Avatar variant="profile" size={130} />
                )}
                <Button variant="outline" className={styles.uploadButton} onClick={() => fileRef.current?.click()}>
                  사진 업로드
                </Button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
              </div>
              <div className={styles.fields}>
                <Field label="이름" labelStyle="profile" htmlFor="mypage-name">
                  <TextField
                    id="mypage-name"
                    appearance="profile"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </Field>
                <Field label="연락처" labelStyle="profile" htmlFor="mypage-phone">
                  <TextField
                    id="mypage-phone"
                    appearance="profile"
                    value={phone}
                    inputMode="tel"
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    autoComplete="tel"
                  />
                </Field>
              </div>
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
