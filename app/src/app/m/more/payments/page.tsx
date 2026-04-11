"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Mail, X, Eye, Send } from "lucide-react";
import { MobilePreviewModal } from "@/components/mobile/MobilePreviewModal";

type Invoice = {
  id: string; invoice_number: string; issue_date: string;
  due_date: string; status: string; total: number;
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
  all: "すべて", sent: "発行済み", delivered: "送付済み", pending: "入金待ち",
  overdue: "期日超過", paid: "入金確認済み", partial: "一部入金",
};

const fmt = (n: number) => "¥" + n.toLocaleString("ja-JP");

export default function MobilePaymentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; postal_code: string | null; address: string | null; phone: string | null; email: string | null } | null>(null);

  const [mailTarget, setMailTarget] = useState<Invoice | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailSending, setMailSending] = useState(false);

  // 領収書メール用
  const [receiptMailTarget, setReceiptMailTarget] = useState<Invoice | null>(null);
  const [receiptMailTo, setReceiptMailTo] = useState("");
  const [receiptMailSubject, setReceiptMailSubject] = useState("");
  const [receiptMailBody, setReceiptMailBody] = useState("");
  const [receiptMailSending, setReceiptMailSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: company } = await supabase
        .from("companies").select("id, name, postal_code, address, phone, email").eq("user_id", user.id).single();
      if (!company) { setLoading(false); return; }
      setCompanyId(company.id);
      setCompanyInfo({ name: company.name, postal_code: company.postal_code, address: company.address, phone: company.phone, email: company.email });

      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, due_date, status, total, customers(name, email)")
        .eq("company_id", company.id)
        .in("status", ["sent", "delivered", "pending", "overdue", "paid", "partial"])
        .order("due_date", { ascending: true });

      // 期日超過の自動判定
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const updated = (data ?? []).map(inv =>
        (inv.status === "sent" || inv.status === "delivered" || inv.status === "partial") && new Date(inv.due_date) < today
          ? { ...inv, status: "overdue" } : inv
      );
      setInvoices(updated);
      setLoading(false);
    };
    load();
  }, []);

  const getCustName = (inv: Invoice) => {
    if (!inv.customers) return "—";
    return Array.isArray(inv.customers) ? inv.customers[0]?.name ?? "—" : inv.customers.name;
  };
  const getCustEmail = (inv: Invoice) => {
    if (!inv.customers) return "";
    return Array.isArray(inv.customers) ? inv.customers[0]?.email ?? "" : inv.customers.email ?? "";
  };

  const filtered = invoices.filter(inv => filter === "all" || inv.status === filter);

  const summary = useMemo(() => {
    const unpaid = invoices.filter(i => ["sent", "delivered", "pending", "overdue", "partial"].includes(i.status));
    return {
      total: unpaid.reduce((s, i) => s + i.total, 0),
      count: unpaid.length,
      overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0),
      overdueCount: invoices.filter(i => i.status === "overdue").length,
      paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0),
      paidCount: invoices.filter(i => i.status === "paid").length,
    };
  }, [invoices]);

  const handleOpenMail = (inv: Invoice) => {
    const custName = getCustName(inv);
    const custEmail = getCustEmail(inv);
    const isOverdue = inv.status === "overdue";
    const ci = companyInfo;
    const sig = ci
      ? `\n\n──────────────────\n${ci.name}${ci.postal_code ? `\n〒${ci.postal_code}` : ""}${ci.address ? `\n${ci.address}` : ""}${ci.phone ? `\nTEL: ${ci.phone}` : ""}${ci.email ? `\n${ci.email}` : ""}\n──────────────────`
      : "";
    setMailTarget(inv);
    setMailTo(custEmail);
    setMailSubject(isOverdue ? `【お支払いのお願い】請求書 ${inv.invoice_number}` : `請求書送付のご案内（${inv.invoice_number}）`);
    setMailBody(isOverdue
      ? `${custName} 御中\n\nお世話になっております。\n\n下記請求書のお支払期限が超過しております。\nお忙しいところ恐れ入りますが、ご確認のうえお手続きをお願いいたします。\n\n請求書番号: ${inv.invoice_number}\n請求金額: ${inv.total.toLocaleString()}円\n支払期限: ${inv.due_date}\n\nご不明点がございましたらお気軽にお問い合わせください。${sig}`
      : `${custName} 御中\n\nお世話になっております。\n\n下記の通り請求書を送付いたします。\nご確認のほどよろしくお願いいたします。\n\n請求書番号: ${inv.invoice_number}\n請求金額: ${inv.total.toLocaleString()}円\n支払期限: ${inv.due_date}\n\nご不明点がございましたらお気軽にお問い合わせください。${sig}`
    );
  };

  const handleSendMail = async () => {
    if (!mailTarget || !companyId || !mailTo) return;
    setMailSending(true); setError("");
    try {
      const res = await fetch("/api/invoices/send-mail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: mailTarget.id, companyId, subject: mailSubject, body: mailBody, to: mailTo }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "送信に失敗しました"); setMailSending(false); return; }
      setInvoices(prev => prev.map(inv => inv.id === mailTarget.id ? { ...inv, status: data.status } : inv));
      setMailTarget(null);
      setToast("メールを送信しました");
      setTimeout(() => setToast(""), 3000);
    } catch { setError("メール送信中にエラーが発生しました"); }
    setMailSending(false);
  };

  const handleOpenReceiptMail = (inv: Invoice) => {
    const custName = getCustName(inv);
    const custEmail = getCustEmail(inv);
    const receiptNumber = inv.invoice_number.replace("INV", "RCT");
    const ci = companyInfo;
    const sig = ci
      ? `\n\n──────────────────\n${ci.name}${ci.postal_code ? `\n〒${ci.postal_code}` : ""}${ci.address ? `\n${ci.address}` : ""}${ci.phone ? `\nTEL: ${ci.phone}` : ""}${ci.email ? `\n${ci.email}` : ""}\n──────────────────`
      : "";
    setReceiptMailTarget(inv);
    setReceiptMailTo(custEmail);
    setReceiptMailSubject(`領収書送付のご案内（${receiptNumber}）`);
    setReceiptMailBody(`${custName} 様\n\nお世話になっております。\n\n下記の通り領収書を送付いたします。\nご査収のほどよろしくお願いいたします。\n\n領収書番号: ${receiptNumber}\n領収金額: ¥${inv.total.toLocaleString()}（税込）\n対応請求書: ${inv.invoice_number}\n\n何かご不明点がございましたらお気軽にお問い合わせください。${sig}`);
  };

  const handleSendReceiptMail = async () => {
    if (!receiptMailTarget || !companyId || !receiptMailTo) return;
    setReceiptMailSending(true); setError("");
    try {
      const res = await fetch("/api/invoices/send-receipt-mail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: receiptMailTarget.id, companyId,
          subject: receiptMailSubject, body: receiptMailBody, to: receiptMailTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "送信に失敗しました"); setReceiptMailSending(false); return; }
      setReceiptMailTarget(null);
      setToast("領収書メールを送信しました");
      setTimeout(() => setToast(""), 3000);
    } catch { setError("メール送信中にエラーが発生しました"); }
    setReceiptMailSending(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 12, padding: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
  };

  return (
    <>
      <MobileHeader title="決済管理" />
      <div style={{ padding: "12px 16px" }}>
        {toast && (
          <div style={{
            position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
            background: "#16a34a", color: "#fff", padding: "8px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>{toast}</div>
        )}
        {error && (
          <div style={{ padding: "10px 14px", marginBottom: 10, borderRadius: 10, fontSize: 13, background: "#fef2f2", color: "#dc2626" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 60 }}>読み込み中...</div>
        ) : (
          <>
            {/* サマリーカード */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>未回収合計</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{fmt(summary.total)}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{summary.count}件</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>期日超過</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#d70015" }}>{fmt(summary.overdue)}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{summary.overdueCount}件</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>入金確認済み</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a7f37" }}>{fmt(summary.paid)}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{summary.paidCount}件</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Stripe決済</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#6e6e73" }}>未連携</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>後日設定予定</div>
              </div>
            </div>

            {/* フィルター */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
              {filterStatuses.map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    border: filter === s ? "none" : "1px solid var(--color-border)",
                    background: filter === s ? "var(--color-primary)" : "#fff",
                    color: filter === s ? "#fff" : "var(--color-text)",
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                  {filterLabels[s]}{s !== "all" ? ` (${invoices.filter(i => i.status === s).length})` : ""}
                </button>
              ))}
            </div>

            {/* 一覧 */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 40 }}>該当する請求書はありません</div>
            ) : (
              filtered.map(inv => {
                const st = statusConfig[inv.status] ?? { label: inv.status, bg: "#f5f5f7", color: "#6e6e73" };
                const isOverdue = inv.status === "overdue";
                return (
                  <div key={inv.id} style={{
                    background: "#fff", borderRadius: 12, padding: "14px 16px",
                    marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{inv.invoice_number}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{getCustName(inv)}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{fmt(inv.total)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: isOverdue ? "#d70015" : "var(--color-text-muted)", fontWeight: isOverdue ? 600 : 400, marginTop: 4 }}>
                      支払期限: {inv.due_date}
                    </div>
                    {/* アクションボタン */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {inv.status === "sent" && (
                        <button onClick={() => handleOpenMail(inv)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Mail size={14} /> メール送信
                        </button>
                      )}
                      {inv.status === "overdue" && (
                        <button onClick={() => handleOpenMail(inv)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#d70015", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Mail size={14} /> リマインドを送る
                        </button>
                      )}
                      {inv.status === "paid" && (
                        <>
                          <button onClick={() => setPreviewUrl(`/invoices/${inv.id}/receipt?embed=1`)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--color-border)", background: "#fff", color: "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Eye size={14} /> プレビュー
                          </button>
                          <button onClick={() => handleOpenReceiptMail(inv)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#0077b6", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Send size={14} /> 領収書送信
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* メール送信モーダル */}
      {mailTarget && (
        <div onClick={() => setMailTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "20px 16px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{mailTarget.status === "overdue" ? "リマインドメール送信" : "請求書メール送信"}</span>
              <button onClick={() => setMailTarget(null)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={20} color="var(--color-text-muted)" /></button>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>{mailTarget.invoice_number} ｜ {fmt(mailTarget.total)}</div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>宛先メールアドレス *</label>
            <input value={mailTo} onChange={e => setMailTo(e.target.value)} placeholder="customer@example.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>件名 *</label>
            <input value={mailSubject} onChange={e => setMailSubject(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>本文 *</label>
            <textarea value={mailBody} onChange={e => setMailBody(e.target.value)} rows={8} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, marginBottom: 16, boxSizing: "border-box", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
            <button onClick={handleSendMail} disabled={mailSending || !mailTo || !mailSubject || !mailBody}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (mailSending || !mailTo || !mailSubject || !mailBody) ? 0.5 : 1 }}>
              <Mail size={16} /> {mailSending ? "送信中..." : "送信"}
            </button>
          </div>
        </div>
      )}
      {/* プレビューモーダル */}
      {previewUrl && (
        <MobilePreviewModal src={previewUrl} title="領収書プレビュー" onClose={() => setPreviewUrl(null)} />
      )}

      {/* 領収書メール送信モーダル */}
      {receiptMailTarget && (
        <div onClick={() => setReceiptMailTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "20px 16px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>領収書メール送信</span>
              <button onClick={() => setReceiptMailTarget(null)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={20} color="var(--color-text-muted)" /></button>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              {receiptMailTarget.invoice_number.replace("INV", "RCT")} ｜ {fmt(receiptMailTarget.total)}
            </div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>宛先メールアドレス *</label>
            <input value={receiptMailTo} onChange={e => setReceiptMailTo(e.target.value)} placeholder="customer@example.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>件名 *</label>
            <input value={receiptMailSubject} onChange={e => setReceiptMailSubject(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>本文 *</label>
            <textarea value={receiptMailBody} onChange={e => setReceiptMailBody(e.target.value)} rows={8} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, marginBottom: 16, boxSizing: "border-box", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
            <button onClick={handleSendReceiptMail} disabled={receiptMailSending || !receiptMailTo || !receiptMailSubject || !receiptMailBody}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#0077b6", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (receiptMailSending || !receiptMailTo || !receiptMailSubject || !receiptMailBody) ? 0.5 : 1 }}>
              <Send size={16} /> {receiptMailSending ? "送信中..." : "領収書を送信"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
