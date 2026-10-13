import type { Task } from '@/mocks/types';

import styles from './TaskAttachments.module.css';

/**
 * '첨부 파일' 탭 내용(Figma 785:7238). 제목 + 2열 사진 칸(283x172, Gray100, radius 16, 간격 20).
 * 시안의 목록 영역은 433px 높이에서 잘리므로(785:8303) 넘치는 줄은 스크롤로 본다.
 */
export function TaskAttachments({ task }: { task: Task }) {
  return (
    <div className={styles.content}>
      <h3 className={`t-body-m-semibold ${styles.title}`}>첨부 파일</h3>
      <ul className={styles.grid}>
        {task.attachments.map((file) => (
          <li key={file.id} className={styles.item}>
            <img className={styles.image} src={file.url} alt={file.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}
