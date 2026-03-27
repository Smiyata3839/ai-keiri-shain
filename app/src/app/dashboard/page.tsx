"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TrendingUp, Wallet, Receipt, AlertCircle, ArrowRightLeft } from "lucide-react";

type Receivable = {
  id: string;
  invoice_number: string;
  due_date: string;
  total: number;
  status: string;
  customers: { name: string }[] | null;
};

type BankTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
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

  useEffect(() => {
    if (!user) return;
    const fetchSideData = async () => {
      const [recResult, txResult] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, due_date, total, status, customers(name)")
          .in("status", ["sent", "partial", "overdue", "pending"])
          .order("due_date", { ascending: true })
          .limit(5),
        supabase
          .from("bank_transactions")
          .select("id, transaction_date, description, amount")
          .order("transaction_date", { ascending: false })
          .limit(5),
      ]);
      if (recResult.data) setReceivables(recResult.data as Receivable[]);
      if (txResult.data) setTransactions(txResult.data as BankTransaction[]);
    };
    fetchSideData();
  }, [user]);

  if (!user) return null;

  const cards = [
    { label: "今月の売上", value: "¥0", icon: TrendingUp, color: "#00D4FF" },
    { label: "未収金合計", value: "¥0", icon: Wallet, color: "#FF9F43" },
    { label: "今月の経費", value: "¥0", icon: Receipt, color: "#7C5CFC" },
  ];

  const formatCurrency = (n: number) =>
    "¥" + n.toLocaleString("ja-JP");

  const statusLabel: Record<string, { text: string; color: string }> = {
    sent: { text: "送付済", color: "#3b6df0" },
    partial: { text: "一部入金", color: "#ea580c" },
    overdue: { text: "期日超過", color: "#dc2626" },
    pending: { text: "確認中", color: "#6b7280" },
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />
      <div style={{ marginLeft: "360px", flex: 1, display: "flex", background: "var(--color-background)" }}>
        {/* 中央メインエリア */}
        <div style={{ flex: 1, padding: "40px", minWidth: 0 }}>
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

        {/* 右パネル */}
        <div style={{
          width: "280px",
          minWidth: "280px",
          borderLeft: "1px solid var(--color-border)",
          background: "var(--color-card)",
          overflowY: "auto",
          padding: "24px 20px",
        }}>
          {/* 未回収売掛金 */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <AlertCircle size={16} color="#FF9F43" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
                未回収売掛金
              </h3>
            </div>
            {receivables.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>データなし</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {receivables.map((r) => {
                  const st = statusLabel[r.status] || { text: r.status, color: "#6b7280" };
                  return (
                    <div key={r.id} style={{
                      padding: "12px",
                      borderRadius: "8px",
                      background: "var(--color-background)",
                      border: "1px solid var(--color-border)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-text)" }}>
                          {r.customers?.[0]?.name || r.invoice_number}
                        </span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: st.color,
                          background: st.color + "14",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}>
                          {st.text}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          期限: {r.due_date}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--color-text)" }}>
                          {formatCurrency(r.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 直近の取引 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <ArrowRightLeft size={16} color="#00D4FF" />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
                直近の取引
              </h3>
            </div>
            {transactions.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>データなし</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "var(--color-background)",
                    border: "1px solid var(--color-border)",
                  }}>
                    <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                      {tx.transaction_date}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: "13px",
                        color: "var(--color-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "150px",
                      }}>
                        {tx.description}
                      </span>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: tx.amount >= 0 ? "#16a34a" : "#dc2626",
                      }}>
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
