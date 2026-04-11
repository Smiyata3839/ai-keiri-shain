"use client";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Camera, MessageSquare, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = { icon: LucideIcon; label: string; path: string };

const tabs: Tab[] = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/m/dashboard" },
  { icon: FileText, label: "請求書", path: "/m/invoices" },
  { icon: Camera, label: "領収書", path: "/m/receipts" },
  { icon: MessageSquare, label: "チャット", path: "/m/chat" },
  { icon: MoreHorizontal, label: "その他", path: "/m/more" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "#ffffff",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 1000,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 8px rgba(0,0,0,0.06)",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.path);
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
              position: "relative",
            }}
          >
            {active && (
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 32,
                height: 3,
                borderRadius: "0 0 3px 3px",
                background: "var(--color-primary)",
              }} />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.2 : 1.5}
              color={active ? "var(--color-primary)" : "var(--color-text-muted)"}
            />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 400,
              color: active ? "var(--color-primary)" : "var(--color-text-muted)",
              letterSpacing: "0.01em",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
