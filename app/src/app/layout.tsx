import type { Metadata } from "next";
import { Providers } from "./providers";
import { ClientLayout } from "@/components/ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "KANBEI",
  description: "中小企業向けAI搭載クラウド経理SaaS",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}