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
        background: "linear-gradient(180deg, #0B1426 0%, #0D1B2A 100%)",
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
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(0,212,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(135deg, #00D4FF 0%, #0098B8 100%)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Briefcase size={18} color="white" />
        </div>
        <span style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "-0.3px" }}>
          AI経理社員
        </span>
      </div>

      {/* メニュー */}
      <nav style={{ flex: 1, padding: "16px 10px" }}>
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.3)",
                padding: "0 10px 8px",
                letterSpacing: "0.1em",
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
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    marginBottom: "2px",
                    background: isActive
                      ? "rgba(0,212,255,0.15)"
                      : "transparent",
                    color: isActive ? "#00D4FF" : "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
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
          padding: "16px 10px 24px",
          borderTop: "1px solid rgba(0,212,255,0.1)",
        }}
      >
        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            color: "rgba(255,255,255,0.4)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <LogOut size={16} />
          <span>ログアウト</span>
        </div>
      </div>
    </div>
  );
}
