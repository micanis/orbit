import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "球面逆投影",
  description: "2点操作・大円描画オプション",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}