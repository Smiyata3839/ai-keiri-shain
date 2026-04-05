"use client";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  Brain,
  CalendarCheck,
  CalendarDays,
  LogOut,
  Camera,
  Bell,
  X,
  Settings,
  Home,
  ClipboardList,
  Calculator,
  Coins,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CreditCard,
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
  icon: LucideIcon;
  isSync?: boolean;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "メイン",
    icon: Home,
    items: [
      { icon: MessageSquare, label: "チャット", path: "/chat" },
      { icon: LayoutDashboard, label: "ダッシュボード", path: "/dashboard" },
    ],
  },
  {
    label: "受発注",
    icon: ClipboardList,
    items: [
      { icon: FilePlus, label: "請求書発行", path: "/invoices/new" },
      { icon: FileText, label: "請求書一覧", path: "/invoices" },
      { icon: Wallet, label: "売掛管理", path: "/receivables" },
      { icon: CreditCard, label: "決済管理", path: "/payments" },
    ],
  },
  {
    label: "会計",
    icon: Calculator,
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
    icon: Coins,
    items: [
      { icon: Receipt, label: "領収書アップロード", path: "/receipts" },
    ],
  },
  {
    label: "KANBEI Sync",
    icon: Sparkles,
    isSync: true,
    items: [
      { icon: Building2, label: "会社プロファイル", path: "/company-profile" },
      { icon: Brain, label: "経営者診断", path: "/owner-diagnosis" },
      { icon: CalendarDays, label: "月次要約", path: "/monthly-summary" },
      { icon: CalendarCheck, label: "年次要約", path: "/annual-summary" },
    ],
  },
  {
    label: "設定",
    icon: Settings,
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
  const [userEmail, setUserEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [openGroups, setOpenGroups] = useState<string[]>(["メイン"]);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setUserEmail(user.email);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("画像サイズは2MB以内にしてください");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPG・PNG・WebP形式のみ対応しています");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className={`sidebar-fixed ${className ?? ""}`}
      style={{
        width: "280px",
        minWidth: "280px",
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
      {/* 上部エリア */}
      <div style={{
        position: "relative",
        padding: "20px var(--space-4) 0",
        marginBottom: "var(--space-6)",
        borderBottom: "1px solid var(--color-sidebar-border)",
        paddingBottom: "var(--space-4)",
      }}>
        {/* 右上のアクションアイコン */}
        <div style={{
          position: "absolute",
          top: "15px",
          right: "15px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
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

        {/* アバター（中央） */}
        <div style={{
          display: "flex",
          justifyContent: "center",
        }}>
          <div style={{ position: "relative", cursor: "pointer" }}
            onClick={() => document.getElementById("avatar-upload")?.click()}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b6df0, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: "600",
                color: "white",
                flexShrink: 0,
              }}>
                {userEmail ? userEmail[0].toUpperCase() : "K"}
              </div>
            )}
            <div style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Camera size={13} color="white" />
            </div>
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* 通知パネル（portalでbodyに描画し、全ページのヘッダーより上に表示） */}
      {showPanel && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            left: "280px",
            top: 0,
            width: "320px",
            height: "100vh",
            background: "var(--color-sidebar)",
            borderLeft: "1px solid var(--color-sidebar-border)",
            zIndex: 99999,
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
        </div>,
        document.body
      )}

      {/* メニュー */}
      <nav style={{ flex: 1, padding: "var(--space-4) var(--space-3)" }}>
        {menuGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups.includes(group.label);
          const isSync = group.isSync;
          return (
            <div key={group.label} style={{
              marginBottom: "4px",
              ...(isSync ? {
                borderTop: "1px solid rgba(13,148,136,0.2)",
                borderBottom: "1px solid rgba(13,148,136,0.2)",
                paddingTop: "4px",
                paddingBottom: "4px",
                marginTop: "4px",
              } : {}),
            }}>
              {/* グループラベル（クリックで開閉） */}
              <div
                onClick={() => toggleGroup(group.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px var(--space-4)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "500",
                  color: isSync ? "#0d9488" : "rgba(255,255,255,0.80)",
                  letterSpacing: "0.02em",
                  borderRadius: "var(--radius-md)",
                  background: isOpen ? "rgba(255,255,255,0.04)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isOpen ? "rgba(255,255,255,0.04)" : "transparent";
                }}
              >
                <GroupIcon size={14} strokeWidth={1.5} />
                <span style={{ flex: 1 }}>{group.label}</span>
                {isOpen ? <ChevronDown size={16} color="rgba(255,255,255,0.55)" /> : <ChevronRight size={16} color="rgba(255,255,255,0.55)" />}
              </div>

              {/* サブ項目（アコーディオン） */}
              <div style={{
                maxHeight: isOpen ? "500px" : "0",
                overflow: "hidden",
                transition: "max-height 0.25s ease",
              }}>
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
                        padding: "8px var(--space-4)",
                        paddingLeft: isActive ? "calc(var(--space-8) - 2px)" : "var(--space-8)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        marginBottom: "2px",
                        borderLeft: isActive ? "2px solid #a5c0ff" : "2px solid transparent",
                        background: isActive
                          ? "var(--color-sidebar-active)"
                          : "transparent",
                        color: isActive ? "var(--color-sidebar-text-active)" : "rgba(255,255,255,0.65)",
                        fontSize: "13px",
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
                      <Icon size={16} strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ログアウト */}
      <div
        style={{
          padding: "var(--space-4) var(--space-3) var(--space-6)",
          borderTop: "1px solid var(--color-sidebar-border)",
        }}
      >
        <div
          onClick={() => setShowLogoutConfirm(true)}
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

      {/* KANBEIロゴ */}
      <div style={{
        padding: "var(--space-6) var(--space-4) 24px",
        borderTop: "1px solid var(--color-sidebar-border)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}>
        <img
          src="/logo-lp.png"
          alt="KANBEI"
          style={{
            width: "64px",
            height: "auto",
            filter: "brightness(0) invert(1)",
            opacity: 0.85,
          }}
        />
        <div style={{
          fontSize: "11px",
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: "1.6",
          marginTop: "4px",
          width: "100%",
          paddingLeft: "var(--space-4)",
          paddingRight: "var(--space-4)",
        }}>
          あなたの会社の経理参謀。
        </div>
      </div>

      {/* ログアウト確認モーダル */}
      {showLogoutConfirm && createPortal(
        <div
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-card)",
              borderRadius: "12px",
              padding: "28px 32px",
              maxWidth: "360px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <p style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--color-text)",
              marginBottom: "8px",
            }}>
              ログアウトしますか？
            </p>
            <p style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              marginBottom: "24px",
            }}>
              再度ログインが必要になります。
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  color: "var(--color-text)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
