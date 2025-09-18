import { useEffect, useRef } from 'react';

export default function useBodyScrollLock(locked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    const body = document.body;

    if (locked) {
      // 現在位置を保持して <body> を固定
      scrollYRef.current = window.scrollY || 0;
      body.style.position = 'fixed';
      body.style.top = `-${scrollYRef.current}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    } else {
      // 復帰して元の位置へ戻す
      const y = -parseInt(body.style.top || '0', 10) || 0;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, y);
    }

    // アンマウント時の保険
    return () => {
      if (locked) {
        const y = -parseInt(body.style.top || '0', 10) || 0;
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        body.style.overflow = '';
        window.scrollTo(0, y);
      }
    };
  }, [locked]);
}
