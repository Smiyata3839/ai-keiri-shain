"use client";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  LayoutDashboard,
  FilePlus,
  FileText,
  Wallet,
  Landmark,
  BookOpen,
  Book,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  Building2,
  LogOut,
  Camera,
  Bell,
  X,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

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
      { icon: LayoutDashboard, label: "ダッシュボード", path: "/dashboard" },
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
      { icon: Book, label: "総勘定元帳", path: "/general-ledger" },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: company } = await supabase
        .from("companies").select("id, logo_url").eq("user_id", user.id).single();
      if (company) {
        setCompanyId(company.id);
        if (company.logo_url) setLogoUrl(company.logo_url);
      }
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, title, body, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (notifs) setNotifications(notifs);
    };
    init();
  }, []);

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel]);

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) { alert("画像は2MB以下にしてください"); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
      await supabase.from("companies").update({ logo_url: base64 }).eq("id", companyId);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className={className}
      style={{
        width: "360px",
        minWidth: "360px",
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
      {/* キャラクターロゴ */}
      <div
        style={{
          padding: "var(--space-6) var(--space-6) var(--space-4)",
          borderBottom: "1px solid var(--color-sidebar-border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        {/* アバター + 右側アクションアイコン */}
        <div style={{ position: "relative" }}>
          <div
            style={{ cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="ロゴ"
                width={120}
                height={120}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  width: "120px",
                  height: "120px",
                }}
              />
            ) : (
              <Image
                src="/logo.png"
                alt="KANBEI"
                width={120}
                height={120}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
                priority
              />
            )}
            <div style={{
              position: "absolute",
              bottom: "4px",
              left: "4px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Camera size={14} color="white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>
          {/* 右側にベル・設定を縦並び */}
          <div style={{
            position: "absolute",
            right: "-32px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}>
            {/* ベル通知 */}
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setShowPanel((v) => !v); }}
            >
              <Bell size={20} color="rgba(255,255,255,0.55)" />
              {unreadCount > 0 && (
                <div style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-8px",
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#dc2626",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {unreadCount}
                </div>
              )}
            </div>
            {/* 設定 */}
            <div
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/company")}
            >
              <Settings size={20} color="rgba(255,255,255,0.55)" />
            </div>
          </div>
        </div>
        <span style={{ fontSize: "14px", fontWeight: "500", color: "rgba(255,255,255,0.7)" }}>
          KANBEI
        </span>
      </div>

      {/* 通知パネル */}
      {showPanel && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            left: "360px",
            top: 0,
            width: "320px",
            height: "100vh",
            background: "#1e293b",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}>
            <span style={{ fontSize: "16px", fontWeight: "700", color: "white" }}>通知</span>
            <X
              size={18}
              color="rgba(255,255,255,0.5)"
              style={{ cursor: "pointer" }}
              onClick={() => setShowPanel(false)}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {notifications.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", textAlign: "center", marginTop: "40px" }}>
                通知はありません
              </p>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    style={{
                      padding: "14px",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      cursor: "pointer",
                      background: isRead ? "transparent" : "rgba(0,212,255,0.08)",
                      border: isRead ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,212,255,0.2)",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "14px",
                        fontWeight: isRead ? "400" : "600",
                        color: isRead ? "rgba(255,255,255,0.5)" : "white",
                      }}>
                        {n.title}
                      </span>
                      {!isRead && (
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#00D4FF",
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <p style={{
                      fontSize: "13px",
                      color: isRead ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.6)",
                      margin: "0 0 6px 0",
                      lineHeight: "1.5",
                    }}>
                      {n.body}
                    </p>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                      {new Date(n.created_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* メニュー */}
      <nav style={{ flex: 1, padding: "var(--space-4) var(--space-3)" }}>
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "var(--space-6)" }}>
            <div
              style={{
                fontSize: "12px",
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
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    marginBottom: "2px",
                    background: isActive
                      ? "var(--color-sidebar-active)"
                      : "transparent",
                    color: isActive ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)",
                    fontSize: "15px",
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
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
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
          padding: "var(--space-4) var(--space-3) var(--space-6)",
          borderTop: "1px solid var(--color-sidebar-border)",
        }}
      >
        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: "15px",
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
          <LogOut size={18} />
          <span>ログアウト</span>
        </div>
      </div>
    </div>
  );
}
