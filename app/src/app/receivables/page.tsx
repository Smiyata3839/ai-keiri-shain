"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";

// ステータス定義
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "下書き",
    color: "#6e6e73",
    bg: "#f5f5f7",
    border: "#d2d2d7",
  },
  sent: {
    label: "送付済み",
    color: "#00D4FF",
    bg: "#e8f1fb",
    border: "#00D4FF",
  },
  partial: {
    label: "一部入金",
    color: "#bf5700",
    bg: "#fff3e0",
    border: "#bf5700",
  },
  paid: {
    label: "入金済み",
    color: "#1a7f37",
    bg: "#e6f4ea",
    border: "#1a7f37",
  },
  overdue: {
    label: "期日超過",
    color: "#d70015",
    bg: "#ffeef0",
    border: "#d70015",
  },
  cancelled: {
    label: "キャンセル",
    color: "#6e6e73",
    bg: "#f5f5f7",
    border: "#d2d2d7",
  },
  bad_debt: {
    label: "貸倒れ",
    color: "#8e0000",
    bg: "#ffeef0",
    border: "#8e0000",
  },
  pending: {
    label: "確認待ち",
    color: "#6e36c8",
    bg: "#f3eeff",
    border: "#6e36c8",
  },
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_8: number;
  tax_10: number;
  total: number;
  notes: string | null;
  customers: {
    name: string;
    kana: string | null;
  } | null;
};

type Summary = {
  totalReceivable: number;
  overdueAmount: number;
  paidThisMonth: number;
  overdueCount: number;
};

export default function ReceivablesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalReceivable: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        setLoading(false);
        return;
      }

      setCompanyId(company.id);

      const { data: rows } = await supabase
        .from("invoices")
        .select(
          `id, invoice_number, issue_date, due_date, status, subtotal, tax_8, tax_10, total, notes,
           customers(name, kana)`
        )
        .eq("company_id", company.id)
        .order("due_date", { ascending: true });

      const list: Invoice[] = (rows ?? []) as unknown as Invoice[];

      // 自動的に期日超過を判定
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const updated = list.map((inv) => {
        if (
          inv.status === "sent" &&
          new Date(inv.due_date) < today
        ) {
          return { ...inv, status: "overdue" };
        }
        return inv;
      });

      setInvoices(updated);

      // サマリー計算
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalReceivable = updated
        .filter((i) =>
          ["sent", "partial", "overdue"].includes(i.status)
        )
        .reduce((s, i) => s + i.total, 0);

      const overdueAmount = updated
        .filter((i) => i.status === "overdue")
        .reduce((s, i) => s + i.total, 0);

      const overdueCount = updated.filter(
        (i) => i.status === "overdue"
      ).length;

      const paidThisMonth = updated
        .filter(
          (i) =>
            i.status === "paid" &&
            new Date(i.due_date) >= monthStart
        )
        .reduce((s, i) => s + i.total, 0);

      setSummary({ totalReceivable, overdueAmount, paidThisMonth, overdueCount });
      setLoading(false);
    }

    load();
  }, []);

  const filtered =
    activeFilter === "all"
      ? invoices
      : invoices.filter((i) => i.status === activeFilter);

  const fmt = (n: number) =>
    "¥" + n.toLocaleString("ja-JP");

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const isOverdue = (inv: Invoice) => inv.status === "overdue";

  const daysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    const diff = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  const statusCounts = Object.keys(STATUS_CONFIG).reduce(
    (acc, key) => {
      acc[key] = invoices.filter((i) => i.status === key).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const activePath = "/receivables";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />

      {/* メインコンテンツ */}
      <div style={{ marginLeft: "360px", flex: 1, background: "var(--color-background, #f5f5f7)", minHeight: "100vh" }}>
      {/* ヘッダー */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--color-border, #d2d2d7)",
          padding: "24px 32px 20px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#1d1d1f",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              売掛管理
            </h1>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>
              請求・回収状況の一元管理
            </p>
          </div>
          <Link
            href="/invoices/new"
            style={{
              backgroundColor: "#00D4FF",
              color: "#fff",
              border: "none",
              borderRadius: 980,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            ＋ 新規請求書
          </Link>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 240,
              color: "#6e6e73",
              fontSize: 15,
            }}
          >
            読み込み中...
          </div>
        ) : (
          <>
            {/* 期日超過アラート */}
            {summary.overdueCount > 0 && (
              <div
                style={{
                  backgroundColor: "#fff5f5",
                  border: "1.5px solid #d70015",
                  borderRadius: 12,
                  padding: "14px 20px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#d70015",
                    }}
                  >
                    期日超過の請求書が {summary.overdueCount} 件あります
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#6e6e73",
                      marginLeft: 12,
                    }}
                  >
                    合計 {fmt(summary.overdueAmount)} が未回収です
                  </span>
                </div>
              </div>
            )}

            {/* サマリーカード */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {[
                {
                  label: "売掛残高",
                  value: fmt(summary.totalReceivable),
                  sub: "未回収合計",
                  accent: "#00D4FF",
                  icon: "💴",
                },
                {
                  label: "期日超過額",
                  value: fmt(summary.overdueAmount),
                  sub: `${summary.overdueCount}件が超過`,
                  accent: "#d70015",
                  icon: "🔴",
                },
                {
                  label: "今月入金済み",
                  value: fmt(summary.paidThisMonth),
                  sub: "当月確認分",
                  accent: "#1a7f37",
                  icon: "✅",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    padding: "20px 24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6e6e73",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{card.icon}</span>
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: card.accent,
                      letterSpacing: "-0.5px",
                      lineHeight: 1.1,
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6e6e73",
                      marginTop: 6,
                    }}
                  >
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* フィルタータブ */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setActiveFilter("all")}
                style={{
                  padding: "7px 16px",
                  borderRadius: 980,
                  border: "1px solid",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor:
                    activeFilter === "all" ? "#0D1B2A" : "#fff",
                  color: activeFilter === "all" ? "#fff" : "#1d1d1f",
                  borderColor:
                    activeFilter === "all" ? "#0D1B2A" : "#d2d2d7",
                }}
              >
                すべて ({invoices.length})
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = statusCounts[key] ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 980,
                      border: "1px solid",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      backgroundColor:
                        activeFilter === key ? cfg.color : "#fff",
                      color: activeFilter === key ? "#fff" : cfg.color,
                      borderColor: cfg.border,
                    }}
                  >
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* 請求書テーブル */}
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                border: "1px solid #f0f0f0",
                overflow: "hidden",
              }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "60px 32px",
                    textAlign: "center",
                    color: "#6e6e73",
                    fontSize: 14,
                  }}
                >
                  該当する請求書がありません
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {[
                        "請求書番号",
                        "顧客名",
                        "発行日",
                        "支払期限",
                        "金額",
                        "ステータス",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#6e6e73",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, idx) => {
                      const cfg =
                        STATUS_CONFIG[inv.status] ?? STATUS_CONFIG["draft"];
                      const overdue = isOverdue(inv);
                      const days = overdue ? daysDiff(inv.due_date) : 0;

                      return (
                        <tr
                          key={inv.id}
                          style={{
                            borderBottom:
                              idx < filtered.length - 1
                                ? "1px solid #f5f5f7"
                                : "none",
                            backgroundColor: overdue
                              ? "#fffafa"
                              : "transparent",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = overdue
                              ? "#fff0f0"
                              : "#f9f9fb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = overdue
                              ? "#fffafa"
                              : "transparent")
                          }
                        >
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#1d1d1f",
                              fontFamily: "monospace",
                            }}
                          >
                            {inv.invoice_number}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 14,
                              color: "#1d1d1f",
                              fontWeight: 500,
                            }}
                          >
                            {inv.customers?.name ?? "—"}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                              color: "#6e6e73",
                            }}
                          >
                            {fmtDate(inv.issue_date)}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                            }}
                          >
                            <div
                              style={{
                                color: overdue ? "#d70015" : "#1d1d1f",
                                fontWeight: overdue ? 600 : 400,
                              }}
                            >
                              {fmtDate(inv.due_date)}
                            </div>
                            {overdue && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#d70015",
                                  marginTop: 2,
                                }}
                              >
                                {days}日超過
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#1d1d1f",
                              textAlign: "right",
                            }}
                          >
                            {fmt(inv.total)}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 980,
                                fontSize: 12,
                                fontWeight: 600,
                                color: cfg.color,
                                backgroundColor: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                              }}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <Link
                              href={`/invoices/${inv.id}`}
                              style={{
                                fontSize: 12,
                                color: "#00D4FF",
                                textDecoration: "none",
                                fontWeight: 500,
                              }}
                            >
                              詳細 →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* フッター集計 */}
            {filtered.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 24,
                  fontSize: 13,
                  color: "#6e6e73",
                }}
              >
                <span>
                  {filtered.length}件表示
                </span>
                <span>
                  合計：
                  <strong style={{ color: "#1d1d1f", marginLeft: 6 }}>
                    {fmt(filtered.reduce((s, i) => s + i.total, 0))}
                  </strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
