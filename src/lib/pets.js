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
      { emoji: '🌰', name: '種子' },
      { emoji: '🌱', name: '發芽' },
      { emoji: '🌿', name: '幼苗' },
      { emoji: '☘️', name: '成株' },
      { emoji: '🌷', name: '含苞' },
      { emoji: '🌸', name: '盛開' },
    ],
  },
  bonsai: {
    kind: 'plant',
    name: '文人樹',
    tagline: '從一根嫩枝養成蒼勁古木',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子' },
      { emoji: '🌱', name: '冒芽' },
      { emoji: '🌿', name: '抽枝' },
      { emoji: '🪴', name: '盆栽' },
      { emoji: '🌳', name: '成樹' },
      { emoji: '🎋', name: '古木' },
    ],
  },
  cactus: {
    kind: 'plant',
    name: '沙漠客',
    tagline: '耐得住乾旱，最後開出小花',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子' },
      { emoji: '🌱', name: '小芽' },
      { emoji: '🌵', name: '幼柱' },
      { emoji: '🌵', name: '帶刺' },
      { emoji: '🪴', name: '盆植' },
      { emoji: '🌺', name: '開花' },
    ],
  },
  // ===== 生物線 =====
  birdie: {
    kind: 'creature',
    name: '圓圓雀',
    tagline: '破殼而出的小圓鳥',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '蛋' },
      { emoji: '🐣', name: '破殼' },
      { emoji: '🐤', name: '雛鳥' },
      { emoji: '🐥', name: '幼鳥' },
      { emoji: '🐦', name: '成鳥' },
      { emoji: '🕊️', name: '展翅' },
    ],
  },
  flutter: {
    kind: 'creature',
    name: '紙蝶',
    tagline: '從毛蟲到翩翩飛舞',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '蟲卵' },
      { emoji: '🐛', name: '幼蟲' },
      { emoji: '🍃', name: '結蛹' },
      { emoji: '🦋', name: '初羽' },
      { emoji: '🦋', name: '成蝶' },
      { emoji: '🌟', name: '幻彩蝶' },
    ],
  },
  inkdragon: {
    kind: 'creature',
    name: '墨龍',
    tagline: '傳說中的小龍，越養越神氣',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '龍蛋' },
      { emoji: '🦎', name: '幼龍' },
      { emoji: '🐊', name: '成長期' },
      { emoji: '🐲', name: '少年龍' },
      { emoji: '🐉', name: '成龍' },
      { emoji: '🐉', name: '神龍' },
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
