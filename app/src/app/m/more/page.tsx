"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import {
  CreditCard, Building2, ScanText, LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MenuItem = { icon: LucideIcon; label: string; path?: string; action?: () => void; color?: string };

export default function MobileMorePage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    if (!confirm("ログアウトしますか？")) return;
    await supabase.auth.signOut();
    router.push("/login");
  };

  const items: MenuItem[] = [
    { icon: CreditCard, label: "決済管理", path: "/m/more/payments" },
    { icon: Building2, label: "自社情報", path: "/m/more/company" },
    { icon: ScanText, label: "会社プロファイル", path: "/m/more/company-profile" },
    { icon: LogOut, label: "ログアウト", action: handleLogout, color: "#dc2626" },
  ];

  return (
    <>
      <MobileHeader title="その他" />
      <div style={{ padding: "16px" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}>
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.action ? item.action() : item.path && router.push(item.path)}
                style={{
                  background: "#fff", borderRadius: 14, padding: "20px 16px",
                  border: "1px solid #f0f0f0", cursor: "pointer",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 10,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <Icon size={28} color={item.color || "var(--color-primary)"} strokeWidth={1.5} />
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: item.color || "var(--color-text)",
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
