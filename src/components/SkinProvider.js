'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_SKIN, SKIN_KEYS, STORAGE_KEY } from '@/lib/skins';

const SkinContext = createContext({ skin: DEFAULT_SKIN, setSkin: () => {} });

export function useSkin() {
  return useContext(SkinContext);
}

export default function SkinProvider({ children }) {
  const [skin, setSkinState] = useState(DEFAULT_SKIN);

  // 首次掛載：讀 localStorage（layout 的 inline script 已先設好 <html data-skin>，
  // 這裡只是把 React state 對齊，避免閃爍）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SKIN_KEYS.includes(saved)) setSkinState(saved);
    } catch {
      /* localStorage 不可用就用預設 */
    }
  }, []);

  const setSkin = useCallback((next) => {
    if (!SKIN_KEYS.includes(next)) return;
    setSkinState(next);
    if (next === DEFAULT_SKIN) {
      delete document.documentElement.dataset.skin;
    } else {
      document.documentElement.dataset.skin = next;
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 忽略 */
    }
  }, []);

  return (
    <SkinContext.Provider value={{ skin, setSkin }}>
      {children}
    </SkinContext.Provider>
  );
}
