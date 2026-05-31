import './globals.css';
import TopLoader from '@/components/TopLoader';
import SkinProvider from '@/components/SkinProvider';

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

// 在 React 接手前先套用造型，避免換頁時閃一下預設色
const skinBootstrap = `try{var s=localStorage.getItem('skin');if(s&&s!=='default')document.documentElement.dataset.skin=s;}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: skinBootstrap }} />
        <TopLoader />
        <SkinProvider>{children}</SkinProvider>
      </body>
    </html>
  );
}
