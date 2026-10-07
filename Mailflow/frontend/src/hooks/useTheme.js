import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('mf_theme') !== 'light';
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('mf_theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('mf_theme', 'light');
    }
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);
  return { isDark, toggle };
}
