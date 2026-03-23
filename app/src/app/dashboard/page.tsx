"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

const menuGroups = [
  {
    label: "メイン",
    items: [
      { icon: "💬", label: "チャット", path: "/chat" },
    ],
  },
  {
    label: "受発注",
    items: [
      { icon: "📄", label: "請求書発行", path: "/invoices/new" },
      { icon: "📋", label: "請求書一覧", path: "/invoices" },
      { icon: "💰", label: "売掛管理", path: "/receivables" },
    ],
  },
  {
    label: "会計",
    items: [
      { icon: "🏦", label: "銀行明細取込", path: "/bank" },
      { icon: "📒", label: "仕訳一覧", path: "/journals" },
      { icon: "📒", label: "総勘定元帳", path: "/general-ledger" },
      { icon: "📊", label: "残高試算表", path: "/trial-balance" },
      { icon: "📈", label: "貸借対照表", path: "/balance-sheet" },
      { icon: "📉", label: "損益計算書", path: "/profit-loss" },
    ],
  },
  {
    label: "経費",
    items: [
      { icon: "🧾", label: "領収書アップロード", path: "/receipts" },
    ],
  },
  {
    label: "設定",
    items: [
      { icon: "👥", label: "顧客管理", path: "/customers" },
      { icon: "🏢", label: "自社情報", path: "/company" },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={{
      width: "260px", minWidth: "260px",
      background: "#1c1c1e",
      color: "white",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "fixed", left: 0, top: 0,
      overflowY: "auto",
    }}>
      {/* ロゴ */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          width: "32px", height: "32px",
          background: "var(--color-primary)",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px",
        }}>💼</div>
        <span style={{ fontSize: "15px", fontWeight: "700" }}>AI経理社員</span>
      </div>

      {/* メニュー */}
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "20px" }}>
            <div style={{
              fontSize: "11px", fontWeight: "600",
              color: "rgba(255,255,255,0.35)",
              padding: "0 8px 6px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 10px", borderRadius: "7px",
                    cursor: "pointer", marginBottom: "2px",
                    background: isActive ? "rgba(0,113,227,0.3)" : "transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.7)",
                    fontSize: "13.5px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ログアウト */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 10px", borderRadius: "7px",
            cursor: "pointer", fontSize: "13.5px",
            color: "rgba(255,255,255,0.5)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{minWidth:"16px"}}>🚪</span><span>ログアウト</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else setUser(user);
    };
    getUser();
  }, []);

  if (!user) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />
      <div style={{ marginLeft: "260px", flex: 1, background: "var(--color-background)", padding: "32px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-text)", marginBottom: "8px" }}>
          ダッシュボード
        </h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
          {user.email} でログイン中
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {[
            { label: "今月の売上", value: "¥0", icon: "📈" },
            { label: "未収金合計", value: "¥0", icon: "💰" },
            { label: "今月の経費", value: "¥0", icon: "🧾" },
          ].map((card) => (
            <div key={card.label} style={{
              background: "var(--color-card)",
              borderRadius: "var(--radius-card)",
              padding: "24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{card.icon}</div>
              <div style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>{card.label}</div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)" }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
