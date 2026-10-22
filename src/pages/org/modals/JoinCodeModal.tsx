import clsx from 'clsx';

import { Icon, Modal } from '@/design-system';
import { useCurrentCompany } from '@/data/selectors';
import { useAppStore } from '@/data/store';

import qrImage from '../assets/join-qr.png';
import styles from './JoinCodeModal.module.css';

export interface JoinCodeModalProps {
  open: boolean;
  onClose: () => void;
  /** '인력관리로 돌아가기' */
  onBackToMembers: () => void;
}

function copyText(text: string | null | undefined) {
  if (!text) return;
  // 복사 완료 안내 시안이 없어 클립보드에만 넣는다.
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

/**
 * 회사 코드·참여 링크 관리 모달(Figma 발급 전 1951:18412 · 발급 후 1951:18795). 1204x590, 화면 가운데.
 * - 회사 코드(+복사), 참여 경로, 코드 정책, 영구 참여 링크(+복사)
 * - 참여 QR 코드: 발급 전에는 'QR 이미지' 자리, 새로고침 → 발급 전이면 issueJoinCode, 발급 후면 regenerateJoinCode
 * - 이미지 저장 → 시안 QR 이미지 내려받기, 인쇄 → 동작 없음(시안 없음)
 * - 코드를 아직 읽지 못했으면 코드 자리에 '-', 링크 칸은 비우고 복사는 아무것도 하지 않는다(서버는 발주사 생성 때 코드를 발급한다)
 *   (시안 1951:18412는 발급 후와 같은 예시 값을 보여 주지만 없는 코드를 지어낼 수 없다).
 * - 닫기 버튼 시안이 없어 Esc·바깥 클릭, '인력관리로 돌아가기'로 닫는다.
 */
export function JoinCodeModal({ open, onClose, onBackToMembers }: JoinCodeModalProps) {
  const company = useCurrentCompany();
  const issueJoinCode = useAppStore((s) => s.issueJoinCode);
  const regenerateJoinCode = useAppStore((s) => s.regenerateJoinCode);
  const code = company?.joinCode ?? null;
  const link = company?.joinLink ?? null;
  const issued = Boolean(code);

  const refresh = () => {
    if (issued) regenerateJoinCode();
    else issueJoinCode();
  };

  const saveImage = () => {
    if (!issued) return;
    const anchor = document.createElement('a');
    anchor.href = qrImage;
    anchor.download = `${code}-QR.png`;
    anchor.click();
  };

  return (
    <Modal open={open} onClose={onClose} closeOnOverlayClick aria-labelledby="join-code-title">
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id="join-code-title" className={styles.headerTitle}>
            회사 코드·참여 링크 관리
          </h2>
        </header>
        <div className={styles.body}>
          <div className={styles.columns}>
            <div className={styles.left}>
              <section className={styles.joinInfo}>
                <h3 className={styles.sectionTitle}>회사 참여 정보</h3>
                <dl className={styles.infoRows}>
                  <div className={styles.infoRow}>
                    <dt>회사 코드</dt>
                    <dd className={styles.codeGroup}>
                      {issued ? <span className={styles.codeChip}>{code}</span> : <span className={styles.empty}>-</span>}
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="회사 코드 복사"
                        onClick={() => copyText(code)}
                      >
                        <Icon name="copy" size={24} color="var(--color-gray-400)" />
                      </button>
                    </dd>
                  </div>
                  <div className={styles.infoRow}>
                    <dt>참여 경로</dt>
                    <dd className={styles.infoValue}>회사 코드 / 참여 링크 / QR 코드</dd>
                  </div>
                  <div className={styles.infoRow}>
                    <dt>코드 정책</dt>
                    <dd className={styles.policy}>
                      <span className={styles.policyChip}>만료 없음</span>
                      <span className={styles.policyChip}>코드 변경 가능</span>
                    </dd>
                  </div>
                </dl>
              </section>
              <section className={styles.linkSection}>
                <h3 className={styles.sectionTitle}>영구 참여 링크</h3>
                <div className={styles.linkRow}>
                  <div className={styles.linkBox}>{link}</div>
                  <button type="button" className={styles.copyButton} onClick={() => copyText(link)}>
                    <Icon name="copy" size={24} color="var(--color-gray-0)" />
                    복사
                  </button>
                </div>
              </section>
            </div>
            <section className={styles.right}>
              <div className={styles.qrHead}>
                <h3 className={styles.sectionTitle}>참여 QR 코드</h3>
                <button
                  type="button"
                  className={styles.refresh}
                  aria-label={issued ? 'QR 코드 새로 발급' : 'QR 코드 발급'}
                  onClick={refresh}
                >
                  <Icon name="retry" size={18} color="var(--color-gray-800)" />
                </button>
              </div>
              <div className={styles.qrBox}>
                {issued ? (
                  <img src={qrImage} alt={`회사 참여 QR 코드 ${code}`} className={styles.qrImage} />
                ) : (
                  <div className={styles.qrPlaceholder}>
                    <Icon name="qr-code" size={40} color="var(--color-gray-300)" />
                    <span>QR 이미지</span>
                  </div>
                )}
              </div>
              <div className={styles.qrActions}>
                <button type="button" className={clsx(styles.outlineButton, styles.saveButton)} onClick={saveImage}>
                  <Icon name="download" size={24} color="var(--color-gray-800)" />
                  이미지 저장
                </button>
                <button type="button" className={clsx(styles.outlineButton, styles.printButton)}>
                  <Icon name="print" size={24} color="var(--color-gray-800)" />
                  인쇄
                </button>
              </div>
            </section>
          </div>
          <button type="button" className={styles.back} onClick={onBackToMembers}>
            인력관리로 돌아가기
          </button>
        </div>
      </div>
    </Modal>
  );
}
