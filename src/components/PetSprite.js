'use client';

import { useEffect, useState } from 'react';
import { PETS } from '@/lib/pets';
import { cn } from '@/lib/utils';

export default function PetSprite({ species, stage = 0, size = 'lg', className }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 監聽系統的減少動態設定
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);
    const listener = (e) => setReduceMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // 當 species 或 stage 改變時，重設錯誤狀態
  useEffect(() => {
    setHasError(false);
  }, [species, stage]);

  const def = PETS[species];
  if (!def) return null;

  const stageInfo = def.stages[stage] || def.stages[0];
  const imgSrc = stageInfo.img || `/pets/${species}/${stage}.png`;
  const emoji = stageInfo.emoji;

  // 大小樣式對照
  const sizeClasses = {
    sm: 'h-9 w-9 text-2xl',
    md: 'h-24 w-24 text-5xl',
    lg: 'h-36 w-36 text-7xl',
    xl: 'h-52 w-52 text-8xl',
  };

  const resolvedSize = sizeClasses[size] || sizeClasses.lg;

  // 根據物種區分待機動畫：植物用搖擺 animate-sway，動物/生物用漂浮 animate-float
  const isPlant = def.kind === 'plant';
  const animationClass = reduceMotion
    ? ''
    : (isPlant ? 'animate-sway' : 'animate-float');

  const showImage = imgSrc && !hasError;

  return (
    <div className={cn("relative flex items-center justify-center select-none", resolvedSize, className)}>
      {showImage ? (
        <img
          src={imgSrc}
          alt={stageInfo.name || species}
          className={cn("w-full h-full object-contain pointer-events-none drop-shadow-sm transition-transform duration-300", animationClass)}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={cn("absolute text-center drop-shadow-sm select-none", animationClass)}>
          {emoji}
        </span>
      )}
    </div>
  );
}
