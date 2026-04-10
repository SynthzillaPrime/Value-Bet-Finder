import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(max-width: 767px)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern API
    mql.addEventListener('change', handleChange);

    // Initial check
    setIsMobile(mql.matches);

    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
};
