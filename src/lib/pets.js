// 寵物養成定義。
//
// 成長機制：每隻寵物有 growth（累積投入的成長值），跨過門檻就進化到下一階段。
// 階段外觀目前用 emoji 佔位；未來要換成插畫，只要把某個 stage 加上 img: '/pets/xxx.png'
// 即可（顯示元件會優先用 img）。

// 各階段需要的「累積」成長值。index = 階段（0 起）。
export const STAGE_THRESHOLDS = [0, 20, 50, 100, 170, 260];
export const MAX_STAGE = STAGE_THRESHOLDS.length - 1;

// 由 growth 算出目前階段
export function stageFromGrowth(growth) {
  let s = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i += 1) {
    if (growth >= STAGE_THRESHOLDS[i]) s = i;
  }
  return s;
}

// 下一階段的門檻（已滿級回傳 null）
export function nextThreshold(growth) {
  for (let i = 0; i < STAGE_THRESHOLDS.length; i += 1) {
    if (growth < STAGE_THRESHOLDS[i]) return STAGE_THRESHOLDS[i];
  }
  return null;
}

// 到下一階段的進度（0~1），已滿級回傳 1
export function stageProgress(growth) {
  const stage = stageFromGrowth(growth);
  if (stage >= MAX_STAGE) return 1;
  const base = STAGE_THRESHOLDS[stage];
  const next = STAGE_THRESHOLDS[stage + 1];
  return Math.min(1, (growth - base) / (next - base));
}

// 物種定義。stages 由小到大，每階段 { emoji, name }（之後可加 img）。
export const PETS = {
  // ===== 植物線 =====
  sprout: {
    kind: 'plant',
    name: '小綠芽',
    tagline: '一顆種子，慢慢開成一朵花',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子', img: '/pets/sprout/0.svg' },
      { emoji: '🌱', name: '發芽', img: '/pets/sprout/1.svg' },
      { emoji: '🌿', name: '幼苗', img: '/pets/sprout/2.svg' },
      { emoji: '☘️', name: '成株', img: '/pets/sprout/3.svg' },
      { emoji: '🌷', name: '含苞', img: '/pets/sprout/4.svg' },
      { emoji: '🌸', name: '盛開', img: '/pets/sprout/5.svg' },
    ],
  },
  bonsai: {
    kind: 'plant',
    name: '文人樹',
    tagline: '從一根嫩枝養成蒼勁古木',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子', img: '/pets/bonsai/0.svg' },
      { emoji: '🌱', name: '冒芽', img: '/pets/bonsai/1.svg' },
      { emoji: '🌿', name: '抽枝', img: '/pets/bonsai/2.svg' },
      { emoji: '🪴', name: '盆栽', img: '/pets/bonsai/3.svg' },
      { emoji: '🌳', name: '成樹', img: '/pets/bonsai/4.svg' },
      { emoji: '🎋', name: '古木', img: '/pets/bonsai/5.svg' },
    ],
  },
  cactus: {
    kind: 'plant',
    name: '沙漠客',
    tagline: '耐得住乾旱，最後開出小花',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子', img: '/pets/cactus/0.svg' },
      { emoji: '🌱', name: '小芽', img: '/pets/cactus/1.svg' },
      { emoji: '🌵', name: '幼柱', img: '/pets/cactus/2.svg' },
      { emoji: '🌵', name: '帶刺', img: '/pets/cactus/3.svg' },
      { emoji: '🪴', name: '盆植', img: '/pets/cactus/4.svg' },
      { emoji: '🌺', name: '開花', img: '/pets/cactus/5.svg' },
    ],
  },
  // ===== 生物線 =====
  birdie: {
    kind: 'creature',
    name: '圓圓雀',
    tagline: '破殼而出的小圓鳥',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '蛋', img: '/pets/birdie/0.svg' },
      { emoji: '🐣', name: '破殼', img: '/pets/birdie/1.svg' },
      { emoji: '🐤', name: '雛鳥', img: '/pets/birdie/2.svg' },
      { emoji: '🐥', name: '幼鳥', img: '/pets/birdie/3.svg' },
      { emoji: '🐦', name: '成鳥', img: '/pets/birdie/4.svg' },
      { emoji: '🕊️', name: '展翅', img: '/pets/birdie/5.svg' },
    ],
  },
  flutter: {
    kind: 'creature',
    name: '紙蝶',
    tagline: '從毛蟲到翩翩飛舞',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '蟲卵', img: '/pets/flutter/0.svg' },
      { emoji: '🐛', name: '幼蟲', img: '/pets/flutter/1.svg' },
      { emoji: '🍃', name: '結蛹', img: '/pets/flutter/2.svg' },
      { emoji: '🦋', name: '初羽', img: '/pets/flutter/3.svg' },
      { emoji: '🦋', name: '成蝶', img: '/pets/flutter/4.svg' },
      { emoji: '🌟', name: '幻彩蝶', img: '/pets/flutter/5.svg' },
    ],
  },
  inkdragon: {
    kind: 'creature',
    name: '墨龍',
    tagline: '傳說中的小龍，越養越神氣',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '龍蛋', img: '/pets/inkdragon/0.svg' },
      { emoji: '🦎', name: '幼龍', img: '/pets/inkdragon/1.svg' },
      { emoji: '🐊', name: '成長期', img: '/pets/inkdragon/2.svg' },
      { emoji: '🐲', name: '少年龍', img: '/pets/inkdragon/3.svg' },
      { emoji: '🐉', name: '成龍', img: '/pets/inkdragon/4.svg' },
      { emoji: '🐉', name: '神龍', img: '/pets/inkdragon/5.svg' },
    ],
  },
};

export const PET_LIST = Object.entries(PETS).map(([key, p]) => ({ key, ...p }));
export const PLANT_LIST = PET_LIST.filter((p) => p.kind === 'plant');
export const CREATURE_LIST = PET_LIST.filter((p) => p.kind === 'creature');

// 取得某物種在某 growth 下要顯示的階段資料
export function appearance(speciesKey, growth) {
  const def = PETS[speciesKey];
  if (!def) return null;
  const stage = stageFromGrowth(growth);
  return { def, stage, ...def.stages[stage] };
}
