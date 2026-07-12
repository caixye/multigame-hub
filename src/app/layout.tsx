import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MultiGame Hub - 多人游戏大厅",
  description: "在线狼人杀 & 谁是卧底游戏平台 (Cloudflare Pages)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
