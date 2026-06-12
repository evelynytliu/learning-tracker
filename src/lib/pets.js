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
      { emoji: '🌱', name: '發芽', img: '/pets/sprout/1.svg', quote: '我醒啦！今天也要長大！' },
      { emoji: '🌿', name: '幼苗', img: '/pets/sprout/2.svg', quote: '長出葉子手手了，擊掌！' },
      { emoji: '☘️', name: '成株', img: '/pets/sprout/3.svg', quote: '我快比你高了喔（並沒有）' },
      { emoji: '🌷', name: '含苞', img: '/pets/sprout/4.svg', quote: '噓……花苞裡在醞釀大事' },
      { emoji: '🌸', name: '盛開', img: '/pets/sprout/5.svg', quote: '登登！全世界最漂亮的花！' },
    ],
  },
  bonsai: {
    kind: 'plant',
    name: '文人樹',
    tagline: '從一根嫩枝養成蒼勁古木',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子', img: '/pets/bonsai/0.svg' },
      { emoji: '🌱', name: '冒芽', img: '/pets/bonsai/1.svg', quote: '一暝大一寸～' },
      { emoji: '🌿', name: '抽枝', img: '/pets/bonsai/2.svg', quote: '我有頭髮了！' },
      { emoji: '🪴', name: '盆栽', img: '/pets/bonsai/3.svg', quote: '這個彎度，很有藝術感吧' },
      { emoji: '🌳', name: '成樹', img: '/pets/bonsai/4.svg', quote: '蒼勁！古樸！（挺胸）' },
      { emoji: '🎋', name: '古木', img: '/pets/bonsai/5.svg', quote: '百年老樹的智慧，參上！' },
    ],
  },
  cactus: {
    kind: 'plant',
    name: '沙漠客',
    tagline: '耐得住乾旱，最後開出小花',
    seedEmoji: '🌰',
    stages: [
      { emoji: '🌰', name: '種子', img: '/pets/cactus/0.svg' },
      { emoji: '🌱', name: '小芽', img: '/pets/cactus/1.svg', quote: '刺刺的，但我心很軟' },
      { emoji: '🌵', name: '幼柱', img: '/pets/cactus/2.svg', quote: '又長高了！抱我要小心喔' },
      { emoji: '🌵', name: '帶刺', img: '/pets/cactus/3.svg', quote: '看我的肌肉（舉手臂）' },
      { emoji: '🪴', name: '盆植', img: '/pets/cactus/4.svg', quote: '金色的刺，比較貴' },
      { emoji: '🌺', name: '開花', img: '/pets/cactus/5.svg', quote: '沙漠裡也能開花，你也可以！' },
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
      { emoji: '🐣', name: '破殼', img: '/pets/birdie/1.svg', quote: '啵！我出來啦！' },
      { emoji: '🐤', name: '雛鳥', img: '/pets/birdie/2.svg', quote: '咕咕！翅膀還只是裝飾品' },
      { emoji: '🐥', name: '幼鳥', img: '/pets/birdie/3.svg', quote: '今天練飛了 0.5 秒！' },
      { emoji: '🐦', name: '成鳥', img: '/pets/birdie/4.svg', quote: '咻——會飛的感覺太棒了！' },
      { emoji: '🕊️', name: '展翅', img: '/pets/birdie/5.svg', quote: '展翅！目標是天空的另一邊！' },
    ],
  },
  flutter: {
    kind: 'creature',
    name: '紙蝶',
    tagline: '從毛蟲到翩翩飛舞',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '蟲卵', img: '/pets/flutter/0.svg' },
      { emoji: '🐛', name: '幼蟲', img: '/pets/flutter/1.svg', quote: '蠕動前進！別小看毛毛蟲！' },
      { emoji: '🍃', name: '結蛹', img: '/pets/flutter/2.svg', quote: '我去睡個覺，醒來會嚇到你' },
      { emoji: '🦋', name: '初羽', img: '/pets/flutter/3.svg', quote: '羽化成功！這對翅膀如何？' },
      { emoji: '🦋', name: '成蝶', img: '/pets/flutter/4.svg', quote: '飛舞吧！世界都是我的花園' },
      { emoji: '🌟', name: '幻彩蝶', img: '/pets/flutter/5.svg', quote: '幻彩光芒！傳說中的蝶神！' },
    ],
  },
  inkdragon: {
    kind: 'creature',
    name: '墨龍',
    tagline: '傳說中的小龍，越養越神氣',
    seedEmoji: '🥚',
    stages: [
      { emoji: '🥚', name: '龍蛋', img: '/pets/inkdragon/0.svg' },
      { emoji: '🦎', name: '幼龍', img: '/pets/inkdragon/1.svg', quote: '破殼！小龍參上！' },
      { emoji: '🐊', name: '成長期', img: '/pets/inkdragon/2.svg', quote: '我會噴火了！（其實是噴嚏）' },
      { emoji: '🐲', name: '少年龍', img: '/pets/inkdragon/3.svg', quote: '翅膀長好了，要載你一程嗎？' },
      { emoji: '🐉', name: '成龍', img: '/pets/inkdragon/4.svg', quote: '吼——這就是成龍的咆哮！' },
      { emoji: '🐉', name: '神龍', img: '/pets/inkdragon/5.svg', quote: '神龍現世！說說你的願望？' },
    ],
  },

  // ===== 搞笑線 =====
  goldpoop: {
    kind: 'funny',
    name: '阿金',
    tagline: '從土堆養成傳說鑽石便便',
    seedEmoji: '💩',
    stages: [
      { emoji: '🟤', name: '神祕土堆', img: '/pets/goldpoop/0.svg' },
      { emoji: '💩', name: '小便便', img: '/pets/goldpoop/1.svg', quote: '欸嘿，不要嫌棄嘛' },
      { emoji: '💩', name: '完美螺旋', img: '/pets/goldpoop/2.svg', quote: '成形了！看這完美的螺旋！' },
      { emoji: '👑', name: '便便國王', img: '/pets/goldpoop/3.svg', quote: '朕，便便界的王者' },
      { emoji: '✨', name: '黃金便便', img: '/pets/goldpoop/4.svg', quote: '純金的！快叫全家來看！' },
      { emoji: '💎', name: '鑽石便便', img: '/pets/goldpoop/5.svg', quote: '鑽石恆久遠，便便永流傳✨' },
    ],
  },
  boba: {
    kind: 'funny',
    name: '珍奶獸',
    tagline: '從一撮茶葉搖成傳說霸王杯',
    seedEmoji: '🧋',
    stages: [
      { emoji: '🍃', name: '一撮茶葉', img: '/pets/boba/0.svg' },
      { emoji: '🥛', name: '空杯期待', img: '/pets/boba/1.svg', quote: '我是空的，快給我珍珠！' },
      { emoji: '🧋', name: '半糖微冰', img: '/pets/boba/2.svg', quote: '半糖微冰，剛剛好' },
      { emoji: '🧋', name: '標準珍奶', img: '/pets/boba/3.svg', quote: '正宗台灣珍奶，讚啦！' },
      { emoji: '🧋', name: '大杯加料', img: '/pets/boba/4.svg', quote: '布丁椰果都來，老闆豪邁！' },
      { emoji: '👑', name: '傳說霸王杯', img: '/pets/boba/5.svg', quote: '全糖霸王杯，喝過的都說讚！' },
    ],
  },
  slackrock: {
    kind: 'funny',
    name: '擺爛石',
    tagline: '進化動畫超隆重，結果……',
    seedEmoji: '🪨',
    stages: [
      { emoji: '🪨', name: '石頭', img: '/pets/slackrock/0.svg' },
      { emoji: '🪨', name: '還是石頭', img: '/pets/slackrock/1.svg', quote: '……有變嗎？' },
      { emoji: '🪨', name: '有裂縫了', img: '/pets/slackrock/2.svg', quote: '裂開。但我沒事' },
      { emoji: '🕶️', name: '戴上墨鏡', img: '/pets/slackrock/3.svg', quote: '戴上墨鏡，帥就完事了' },
      { emoji: '⛓️', name: '金鍊大哥', img: '/pets/slackrock/4.svg', quote: '以後叫我石頭大哥' },
      { emoji: '🛸', name: '傳說浮空石', img: '/pets/slackrock/5.svg', quote: '我浮起來了。但還是石頭' },
    ],
  },
  capybara: {
    kind: 'funny',
    name: '泡湯水豚',
    tagline: '無所謂大師，泡著泡著就變強',
    seedEmoji: '🍊',
    stages: [
      { emoji: '🍊', name: '一顆橘子', img: '/pets/capybara/0.svg' },
      { emoji: '👃', name: '探出鼻孔', img: '/pets/capybara/1.svg', quote: '噗嚕嚕……（冒泡）' },
      { emoji: '🦫', name: '半顆頭', img: '/pets/capybara/2.svg', quote: '水溫剛好，先泡再說' },
      { emoji: '🛁', name: '下水泡湯', img: '/pets/capybara/3.svg', quote: '人生啊，泡著泡著就懂了' },
      { emoji: '🧖', name: '頭巾湯客', img: '/pets/capybara/4.svg', quote: '頭巾，是對泡湯的尊重' },
      { emoji: '⛩️', name: '溫泉大師', img: '/pets/capybara/5.svg', quote: '大師沒有煩惱，只有橘子' },
    ],
  },
};

export const PET_LIST = Object.entries(PETS).map(([key, p]) => ({ key, ...p }));
export const PLANT_LIST = PET_LIST.filter((p) => p.kind === 'plant');
export const CREATURE_LIST = PET_LIST.filter((p) => p.kind === 'creature');
export const FUNNY_LIST = PET_LIST.filter((p) => p.kind === 'funny');

// 取得某物種在某 growth 下要顯示的階段資料
export function appearance(speciesKey, growth) {
  const def = PETS[speciesKey];
  if (!def) return null;
  const stage = stageFromGrowth(growth);
  return { def, stage, ...def.stages[stage] };
}
