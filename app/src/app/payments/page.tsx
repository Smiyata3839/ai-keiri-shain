"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  customers: { name: string; email: string | null }[] | { name: string; email: string | null } | null;
};

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  sent: { label: "発行済み", bg: "#d1fae5", color: "#065f46" },
  delivered: { label: "送付済み", bg: "#e8f1fb", color: "#0077b6" },
  pending: { label: "入金待ち", bg: "#f3eeff", color: "#6e36c8" },
  overdue: { label: "期日超過", bg: "#ffeef0", color: "#d70015" },
  paid: { label: "入金確認済み", bg: "#e6f4ea", color: "#1a7f37" },
  partial: { label: "一部入金", bg: "#fff3e0", color: "#bf5700" },
};

const filterStatuses = ["all", "sent", "delivered", "pending", "overdue", "paid", "partial"] as const;
const filterLabels: Record<string, string> = {
  all: "すべて",
  sent: "発行済み",
  delivered: "送付済み",
  pending: "入金待ち",
  overdue: "期日超過",
  paid: "入金確認済み",
  partial: "一部入金",
};

export default function PaymentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; postal_code: string | null; address: string | null; phone: string | null; email: string | null } | null>(null);

  // メール送信モーダル用
  const [mailTarget, setMailTarget] = useState<Invoice | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailSending, setMailSending] = useState(false);

  const handleOpenMailModal = (inv: Invoice) => {
    const cust = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers;
    const custName = cust?.name ?? "";
    const custEmail = cust?.email ?? "";
    const ci = companyInfo;
    const sig = ci
      ? `\n\n──────────────────\n${ci.name}${ci.postal_code ? `\n〒${ci.postal_code}` : ""}${ci.address ? `\n${ci.address}` : ""}${ci.phone ? `\nTEL: ${ci.phone}` : ""}${ci.email ? `\n${ci.email}` : ""}\n──────────────────`
      : "";

    setMailTarget(inv);
    setMailTo(custEmail);
    if (inv.status === "overdue") {
      setMailSubject(`【お支払いのお願い】請求書 ${inv.invoice_number}`);
      setMailBody(
        `${custName} 御中\n\nお世話になっております。\n\n下記請求書のお支払期限が超過しております。\nお忙しいところ恐れ入りますが、ご確認のうえお手続きをお願いいたします。\n\n請求書番号: ${inv.invoice_number}\n請求金額: ${inv.total.toLocaleString()}円\n支払期限: ${inv.due_date}\n\nご不明点がございましたらお気軽にお問い合わせください。${sig}`
      );
    } else {
      setMailSubject(`請求書送付のご案内（${inv.invoice_number}）`);
      setMailBody(
        `${custName} 御中\n\nお世話になっております。\n\n下記の通り請求書を送付いたします。\nご確認のほどよろしくお願いいたします。\n\n請求書番号: ${inv.invoice_number}\n請求金額: ${inv.total.toLocaleString()}円\n支払期限: ${inv.due_date}\n\nご不明点がございましたらお気軽にお問い合わせください。${sig}`
      );
    }
  };

  const handleSendMail = async () => {
    if (!mailTarget || !companyId || !mailTo) return;
    setMailSending(true);
    setError("");
    try {
      const res = await fetch("/api/invoices/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: mailTarget.id,
          companyId,
          subject: mailSubject,
          body: mailBody,
          to: mailTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "送信に失敗しました"); setMailSending(false); return; }
      setInvoices((prev) => prev.map((inv) =>
        inv.id === mailTarget.id ? { ...inv, status: data.status } : inv
      ));
      setMailTarget(null);
      setToast(mailTarget.status === "overdue" ? "リマインドメールを送信しました" : "メールを送信しました");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setError("メール送信中にエラーが発生しました");
    }
    setMailSending(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: comp } = await supabase
        .from("companies")
        .select("id, name, postal_code, address, phone, email")
        .eq("user_id", user.id)
        .single();
      if (!comp) { setLoading(false); return; }
      setCompanyId(comp.id);
      setCompanyInfo(comp);

      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, due_date, status, total, customers(name, email)")
        .eq("company_id", comp.id)
        .in("status", ["sent", "delivered", "pending", "overdue", "paid", "partial"])
        .order("due_date", { ascending: true });

      // 期日超過を動的に判定
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const updated = (data ?? []).map((inv) => {
        if (["sent", "delivered", "partial"].includes(inv.status) && new Date(inv.due_date) < today) {
          return { ...inv, status: "overdue" };
        }
        return inv;
      });
      setInvoices(updated);
      setLoading(false);
    };
    init();
  }, []);

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  const summary = {
    total: invoices.filter((i) => ["sent", "delivered", "pending", "overdue", "partial"].includes(i.status)).reduce((s, i) => s + i.total, 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
    count: invoices.filter((i) => ["sent", "delivered", "pending", "overdue", "partial"].includes(i.status)).length,
  };

  const fmt = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh" }}>
      {/* ヘッダー */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid var(--color-border)",
        background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>決済管理</h2>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>請求書の入金状況を管理します</p>
      </div>

      <div className="payment-page" style={{ padding: "24px" }}>
        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: "16px",
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: "var(--radius-card)", color: "#dc2626", fontSize: "14px",
          }}>{error}</div>
        )}

        {/* サマリーカード */}
        <div className="payment-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "未回収合計", value: fmt(summary.total), sub: `${summary.count}件`, color: "#1d1d1f" },
            { label: "期日超過", value: fmt(summary.overdue), sub: `${invoices.filter((i) => i.status === "overdue").length}件`, color: "#d70015" },
            { label: "入金確認済み", value: fmt(summary.paid), sub: `${invoices.filter((i) => i.status === "paid").length}件`, color: "#1a7f37" },
            { label: "Stripe決済", value: "未連携", sub: "後日設定予定", color: "#6e6e73" },
          ].map((card, i) => (
            <div key={i} style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>{card.label}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: card.color }}>{card.value}</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* フィルター */}
        <div className="payment-filter" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {filterStatuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: "980px", fontSize: "12px", fontWeight: "600",
                border: filter === s ? "none" : "1px solid var(--color-border)",
                background: filter === s ? "var(--color-primary)" : "white",
                color: filter === s ? "white" : "var(--color-text)",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              {filterLabels[s]}
              {s !== "all" && ` (${invoices.filter((i) => i.status === s).length})`}
            </button>
          ))}
        </div>

        {/* テーブル */}
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "60px" }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "60px" }}>
            該当する請求書はありません
          </div>
        ) : (
          <div className="payment-table-wrap" style={{
            background: "var(--color-card)", borderRadius: "var(--radius-card)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={thStyle}>請求書番号</th>
                  <th style={thStyle}>顧客名</th>
                  <th style={thStyle}>支払期限</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>金額</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>ステータス</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const st = statusConfig[inv.status] ?? { label: inv.status, bg: "#f3f4f6", color: "#374151" };
                  const custName = Array.isArray(inv.customers) ? inv.customers[0]?.name ?? "-" : inv.customers?.name ?? "-";
                  const isOverdue = inv.status === "overdue";
                  return (
                    <tr key={inv.id}
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={tdStyle}><span style={{ fontWeight: "600" }}>{inv.invoice_number}</span></td>
                      <td style={tdStyle}>{custName}</td>
                      <td style={{ ...tdStyle, color: isOverdue ? "#d70015" : "var(--color-text)", fontWeight: isOverdue ? 600 : 400 }}>{inv.due_date}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{inv.total.toLocaleString()}円</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px",
                          borderRadius: "980px", fontSize: "12px", fontWeight: "600",
                          background: st.bg, color: st.color,
                        }}>{st.label}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        {inv.status === "sent" && (
                          <button onClick={() => handleOpenMailModal(inv)}
                            style={{ ...flatBtnStyle, border: "1px solid #0077b6", color: "#0077b6" }}>
                            メール送信
                          </button>
                        )}
                        {inv.status === "delivered" && (
                          <button onClick={() => router.push(`/invoices/${inv.id}`)}
                            style={{ ...flatBtnStyle, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                            再送信
                          </button>
                        )}
                        {inv.status === "overdue" && (
                          <button onClick={() => handleOpenMailModal(inv)}
                            style={{ ...flatBtnStyle, border: "1px solid #d70015", color: "#d70015" }}>
                            リマインドを送る
                          </button>
                        )}
                        {inv.status === "paid" && (
                          <button onClick={() => router.push(`/invoices/${inv.id}/receipt`)}
                            style={{ ...flatBtnStyle, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                            領収書を発行
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* トースト */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 99999,
          padding: "12px 20px", borderRadius: "var(--radius-card)",
          background: "#1d1d1f", color: "white", fontSize: "14px", fontWeight: "600",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>
          {toast}
        </div>
      )}

      {/* リマインドメール送信モーダル */}
      {mailTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { if (!mailSending) setMailTarget(null); }}>
          <div style={{
            background: "white", borderRadius: "var(--radius-card)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)", width: "520px",
            maxHeight: "90vh", overflowY: "auto", padding: "28px",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--color-text)" }}>
                {mailTarget.status === "overdue" ? "リマインドメール送信" : "請求書メール送信"}
              </h3>
              <button onClick={() => setMailTarget(null)} disabled={mailSending}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                ×
              </button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={modalLabelStyle}>請求書番号</label>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text)" }}>{mailTarget.invoice_number}</div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={modalLabelStyle}>宛先メールアドレス *</label>
              <input value={mailTo} onChange={(e) => setMailTo(e.target.value)}
                placeholder="customer@example.com"
                style={modalInputStyle} />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={modalLabelStyle}>件名 *</label>
              <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)}
                style={modalInputStyle} />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={modalLabelStyle}>本文 *</label>
              <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)}
                rows={10}
                style={{ ...modalInputStyle, resize: "vertical", lineHeight: "1.6" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setMailTarget(null)} disabled={mailSending}
                style={{
                  padding: "8px 20px", borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)", background: "white",
                  color: "var(--color-text)", fontSize: "13px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                キャンセル
              </button>
              <button onClick={handleSendMail}
                disabled={mailSending || !mailTo || !mailSubject || !mailBody}
                style={{
                  padding: "8px 20px", borderRadius: "var(--radius-button)",
                  border: "none", background: mailTarget.status === "overdue" ? "#d70015" : "var(--color-primary)",
                  color: "white", fontSize: "13px", fontWeight: "600",
                  cursor: mailSending ? "not-allowed" : "pointer",
                  opacity: (mailSending || !mailTo || !mailSubject || !mailBody) ? 0.6 : 1,
                  fontFamily: "var(--font-sans)",
                }}>
                {mailSending ? "送信中..." : mailTarget.status === "overdue" ? "リマインドを送信" : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left",
  fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", color: "var(--color-text)",
};

const flatBtnStyle: React.CSSProperties = {
  padding: "4px 12px", borderRadius: "var(--radius-button)",
  background: "transparent", fontSize: "12px", fontWeight: "600",
  cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap",
};

const modalLabelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)", marginBottom: "6px",
};

const modalInputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--color-border)", borderRadius: "8px",
  fontSize: "14px", outline: "none", fontFamily: "var(--font-sans)",
  background: "white", boxSizing: "border-box",
};
