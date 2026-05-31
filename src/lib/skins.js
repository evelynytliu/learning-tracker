// 造型（skin）定義。新增造型：在這裡加一筆，並在 globals.css 補上
// [data-skin='<key>'] 的樣式即可。'default' 不需要額外 CSS。
export const SKINS = [
  {
    key: 'default',
    name: '經典挑戰',
    emoji: '⚡',
    desc: '清新藍的運動挑戰風',
    swatch: ['#2563eb', '#06b6d4', '#f97316'],
  },
  {
    key: 'greninja',
    name: '甲賀忍蛙',
    emoji: '🐸',
    desc: '水忍者的深海作戰風',
    swatch: ['#0e2a4d', '#38bdf8', '#e0566f'],
  },
];

export const DEFAULT_SKIN = 'default';
export const SKIN_KEYS = SKINS.map((s) => s.key);
export const SKIN_MAP = Object.fromEntries(SKINS.map((s) => [s.key, s]));
export const STORAGE_KEY = 'skin';
