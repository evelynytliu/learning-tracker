// 徽章定義（前端）。key 要和 SQL evaluate_achievements() 裡的字串一致。
// 解鎖判定在資料庫，這裡只負責顯示。

export const ACHIEVEMENTS = [
  { key: 'streak_3',       emoji: '🔥', name: '起步走',     desc: '連續達標 3 天' },
  { key: 'streak_7',       emoji: '🔥', name: '一週不間斷', desc: '連續達標 7 天' },
  { key: 'streak_30',      emoji: '🌟', name: '一個月堅持', desc: '連續達標 30 天' },
  { key: 'streak_100',     emoji: '👑', name: '百日王者',   desc: '連續達標 100 天' },
  { key: 'total_10',       emoji: '✅', name: '十全十美',   desc: '累積完成 10 天打卡' },
  { key: 'total_50',       emoji: '🏅', name: '五十里程',   desc: '累積完成 50 天打卡' },
  { key: 'total_100',      emoji: '🏆', name: '百次達成',   desc: '累積完成 100 天打卡' },
  { key: 'mistakes_8',     emoji: '📝', name: '錯題新手',   desc: '登記 8 筆錯題' },
  { key: 'mistakes_30',    emoji: '🔍', name: '診斷高手',   desc: '登記 30 筆錯題' },
  { key: 'pinxuetang_10',  emoji: '📕', name: '閱讀新星',   desc: '品學堂讀滿 10 天' },
  { key: 'pinxuetang_30',  emoji: '📚', name: '閱讀達人',   desc: '品學堂讀滿 30 天' },
  { key: 'weekly_perfect', emoji: '🎯', name: '完美一週',   desc: '單週目標全部達成' },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a]));
