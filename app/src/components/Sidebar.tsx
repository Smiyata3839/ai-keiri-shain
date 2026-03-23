"use client";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  FilePlus,
  FileText,
  Wallet,
  Landmark,
  BookOpen,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  Building2,
  Briefcase,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "メイン",
    items: [
      { icon: MessageSquare, label: "チャット", path: "/chat" },
    ],
  },
  {
    label: "受発注",
    items: [
      { icon: FilePlus, label: "請求書発行", path: "/invoices/new" },
      { icon: FileText, label: "請求書一覧", path: "/invoices" },
      { icon: Wallet, label: "売掛管理", path: "/receivables" },
    ],
  },
  {
    label: "会計",
    items: [
      { icon: Landmark, label: "銀行明細取込", path: "/bank" },
      { icon: BookOpen, label: "仕訳一覧", path: "/journals" },
      { icon: BookOpen, label: "総勘定元帳", path: "/general-ledger" },
      { icon: BarChart3, label: "残高試算表", path: "/trial-balance" },
      { icon: TrendingUp, label: "貸借対照表", path: "/balance-sheet" },
      { icon: TrendingDown, label: "損益計算書", path: "/profit-loss" },
    ],
  },
  {
    label: "経費",
    items: [
      { icon: Receipt, label: "領収書アップロード", path: "/receipts" },
    ],
  },
  {
    label: "設定",
    items: [
      { icon: Users, label: "顧客管理", path: "/customers" },
      { icon: Building2, label: "自社情報", path: "/company" },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className={className}
      style={{
        width: "260px",
        minWidth: "260px",
        background: "var(--color-sidebar)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        overflowY: "auto",
      }}
    >
      {/* ロゴ */}
      <div
        style={{
          padding: "var(--space-6) var(--space-5) var(--space-5)",
          borderBottom: "1px solid var(--color-sidebar-border)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            background: "var(--color-primary)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Briefcase size={17} color="white" />
        </div>
        <span style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.2px" }}>
          AI経理社員
        </span>
      </div>

      {/* メニュー */}
      <nav style={{ flex: 1, padding: "var(--space-4) var(--space-2)" }}>
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "var(--space-5)" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.3)",
                padding: "0 var(--space-3) var(--space-2)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path === "/invoices" && pathname?.startsWith("/invoices/") && pathname !== "/invoices/new");
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    marginBottom: "1px",
                    background: isActive
                      ? "var(--color-sidebar-active)"
                      : "transparent",
                    color: isActive ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)",
                    fontSize: "13.5px",
                    fontWeight: isActive ? "500" : "400",
                    transition: "background 0.15s, color 0.15s",
                    lineHeight: "1.5",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--color-sidebar-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ログアウト */}
      <div
        style={{
          padding: "var(--space-4) var(--space-2) var(--space-6)",
          borderTop: "1px solid var(--color-sidebar-border)",
        }}
      >
        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontSize: "13.5px",
            color: "rgba(255,255,255,0.35)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-sidebar-hover)";
            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.35)";
          }}
        >
          <LogOut size={16} />
          <span>ログアウト</span>
        </div>
      </div>
    </div>
  );
}
