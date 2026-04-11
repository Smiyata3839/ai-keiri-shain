import type { Metadata } from "next";
import { Suspense } from "react";
import { Providers } from "./providers";
import { ClientLayout } from "@/components/ClientLayout";
import { Noto_Sans_JP, DM_Sans } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KANBEI",
  description: "中小企業向けAI搭載クラウド経理SaaS",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${dmSans.variable}`}>
      <body className={`${notoSansJP.variable} ${dmSans.variable}`}>
        <Providers>
          <Suspense><ClientLayout>{children}</ClientLayout></Suspense>
        </Providers>
      </body>
    </html>
  );
}
