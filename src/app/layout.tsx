import type { Metadata } from 'next';
import { Fraunces, Inter, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/header';
import './globals.css';

// 正文 / UI 无衬线
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

// 标题衬线显示字体(温暖编辑风)
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ZSXQ Exporter - 知识星球内容导出与分析',
  description: '导出知识星球帖子为 Markdown，利用 AI 分析内容并生成总结',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
