"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TrendingUp, Wallet, Receipt } from "lucide-react";

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

  const cards = [
    { label: "今月の売上", value: "¥0", icon: TrendingUp, color: "#00D4FF" },
    { label: "未収金合計", value: "¥0", icon: Wallet, color: "#FF9F43" },
    { label: "今月の経費", value: "¥0", icon: Receipt, color: "#7C5CFC" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />
      <div style={{ marginLeft: "360px", flex: 1, background: "var(--color-background)", padding: "40px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)", marginBottom: "8px" }}>
          ダッシュボード
        </h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "36px", fontSize: "15px" }}>
          {user.email} でログイン中
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={{
                background: "var(--color-card)",
                borderRadius: "var(--radius-card)",
                padding: "28px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                border: "1px solid var(--color-border)",
              }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: card.color + "18",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "16px",
                }}>
                  <Icon size={20} color={card.color} />
                </div>
                <div style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "6px" }}>{card.label}</div>
                <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--color-text)", letterSpacing: "-0.5px" }}>{card.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
