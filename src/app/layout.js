import './globals.css';

export const metadata = {
  title: '學習進度管理',
  description: '自主學習打卡 + 錯題診斷',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // 讓 env(safe-area-inset-*) 在 iOS 生效
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
