import { useLayoutEffect, useState } from 'react';

/**
 * 모달·드롭다운 포털 대상(#overlay-root, AppStage 캔버스 안)을 돌려준다.
 * AppStage는 children 다음에 #overlay-root를 그리므로, 첫 렌더에서 바로 열린 모달(예: /tasks/:taskId 직접 진입)도
 * 그려지도록 커밋 직후 다시 찾는다.
 */
export function useOverlayRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(() =>
    typeof document === 'undefined' ? null : document.getElementById('overlay-root'),
  );
  useLayoutEffect(() => {
    if (!root || !root.isConnected) setRoot(document.getElementById('overlay-root'));
  }, [root]);
  return root;
}
