import { type RefObject, useEffect, useRef, useState } from 'react';

/** 요소가 화면에 처음 들어오면 true가 되고 그대로 유지된다(등장 효과용) */
export function useRevealed<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return [ref, revealed];
}
