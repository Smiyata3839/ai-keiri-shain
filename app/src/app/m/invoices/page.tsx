"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Search, ChevronDown, Mail, Eye, X } from "lucide-react";
import { MobilePreviewModal } from "@/components/mobile/MobilePreviewModal";

type Invoice = {
  id: string; invoice_number: string; issue_date: string;
  due_date: string; status: string; total: number;
  customers: { name: string; email: string | null }[] | { name: string; email: string | null } | null;
};

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "作成中", bg: "#fef3c7", color: "#92400e" },
  sent: { label: "発行済み", bg: "#d1fae5", color: "#065f46" },
  delivered: { label: "送付済み", bg: "#e8f1fb", color: "#0077b6" },
  pending: { label: "入金待ち", bg: "#f3eeff", color: "#6e36c8" },
  overdue: { label: "期日超過", bg: "#ffeef0", color: "#d70015" },
  paid: { label: "入金確認済み", bg: "#e6f4ea", color: "#1a7f37" },
  partial: { label: "一部入金", bg: "#fff3e0", color: "#bf5700" },
  cancelled: { label: "無効", bg: "#f5f5f7", color: "#6e6e73" },
};

const filters = ["all", "sent", "overdue", "paid"] as const;
const filterLabels: Record<string, string> = { all: "すべて", sent: "発行済み", overdue: "期日超過", paid: "入金済み" };

function getStartMonth(fm: number) { return (fm % 12) + 1; }
function getCurrentFiscalStartYear(today: Date, sm: number) {
  const y = today.getFullYear(), m = today.getMonth() + 1;
  return m >= sm ? y : y - 1;
}
function getFiscalRange(sy: number, sm: number) {
  const startM = String(sm).padStart(2, "0");
  let endMonth = sm - 1;
  let endYear = sy + 1;
  if (endMonth <= 0) { endMonth += 12; endYear -= 1; }
  const endM = String(endMonth).padStart(2, "0");
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  return { start: `${sy}-${startM}-01`, end: `${endYear}-${endM}-${String(lastDay).padStart(2, "0")}` };
}

export default function MobileInvoicesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startMonth, setStartMonth] = useState(4);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const companyIdRef = useRef<string | null>(null);
  const startMonthRef = useRef(4);
  const loadIdRef = useRef(0);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; postal_code: string | null; address: string | null; phone: string | null; email: string | null } | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // メール送信
  const [mailTarget, setMailTarget] = useState<Invoice | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailSending, setMailSending] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const yearOptions = useMemo(() => {
    if (!selectedYear) return [];
    const opts: number[] = [];
    for (let y = selectedYear - 3; y <= selectedYear + 1; y++) opts.push(y);
    return opts;
  }, [selectedYear]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: company } = await supabase
        .from("companies").select("id, fiscal_month, name, postal_code, address, phone, email").eq("user_id", user.id).single();
      if (!company) { setLoading(false); return; }
      const sm = getStartMonth(company.fiscal_month || 3);
      const fy = getCurrentFiscalStartYear(new Date(), sm);
      setStartMonth(sm);
      startMonthRef.current = sm;
      setCompanyId(company.id);
      companyIdRef.current = company.id;
      setCompanyInfo({ name: company.name, postal_code: company.postal_code, address: company.address, phone: company.phone, email: company.email });
      setSelectedYear(fy);
      loadInvoices(company.id, fy, sm);
    };
    init();
  }, []);

  async function loadInvoices(cid: string, year: number, sm: number) {
    const thisLoad = ++loadIdRef.current;
    setLoading(true);
    const { start, end } = getFiscalRange(year, sm);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, status, total, customers(name, email)")
      .eq("company_id", cid)
      .gte("issue_date", start).lte("issue_date", end)
      .order("issue_date", { ascending: false });
    if (thisLoad !== loadIdRef.current) return;
    // 期日超過を自動判定
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const updated = (data ?? []).map(inv =>
      (inv.status === "sent" || inv.status === "delivered") && new Date(inv.due_date) < today
        ? { ...inv, status: "overdue" }
        : inv
    );
    setInvoices(updated);
    setLoading(false);
  }

  const getCustName = (inv: Invoice) => {
    if (!inv.customers) return "—";
    return Array.isArray(inv.customers) ? inv.customers[0]?.name ?? "—" : inv.customers.name;
  };

  const getCustEmail = (inv: Invoice) => {
    if (!inv.customers) return "";
    return Array.isArray(inv.customers) ? inv.customers[0]?.email ?? "" : inv.customers.email ?? "";
  };

  const filtered = invoices.filter(inv => {
    if (filter !== "all" && inv.status !== filter) return false;
    if (search && !inv.invoice_number.toLowerCase().includes(search.toLowerCase()) &&
        !getCustName(inv).includes(search)) return false;
    return true;
  });

  const fmt = (n: number) => "¥" + n.toLocaleString("ja-JP");

  const handleOpenMail = (inv: Invoice) => {
    const custName = getCustName(inv);
    const custEmail = getCustEmail(inv);
    const ci = companyInfo;
    const sig = ci
      ? `\n\n──────────────────\n${ci.name}${ci.postal_code ? `\n〒${ci.postal_code}` : ""}${ci.address ? `\n${ci.address}` : ""}${ci.phone ? `\nTEL: ${ci.phone}` : ""}${ci.email ? `\n${ci.email}` : ""}\n──────────────────`
      : "";

    setMailTarget(inv);
    setMailTo(custEmail);
    setMailSubject(`請求書送付のご案内（${inv.invoice_number}）`);
    setMailBody(`${custName} 御中\n\nお世話になっております。\n\n下記の通り請求書を送付いたします。\nご確認のほどよろしくお願いいたします。\n\n請求書番号: ${inv.invoice_number}\n請求金額: ${inv.total.toLocaleString()}円\n支払期限: ${inv.due_date}\n\nご不明点がございましたらお気軽にお問い合わせください。${sig}`);
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
      setInvoices(prev => prev.map(inv =>
        inv.id === mailTarget.id ? { ...inv, status: data.status } : inv
      ));
      setMailTarget(null);
      setToast("メールを送信しました");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setError("メール送信中にエラーが発生しました");
    }
    setMailSending(false);
  };

  const yearSelector = (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={selectedYear ?? ""}
        onChange={e => {
          const y = Number(e.target.value);
          setSelectedYear(y);
          if (companyIdRef.current) loadInvoices(companyIdRef.current, y, startMonthRef.current);
        }}
        style={{
          appearance: "none",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600,
          padding: "4px 24px 4px 10px", cursor: "pointer", outline: "none",
        }}
      >
        {yearOptions.map(y => (
          <option key={y} value={y} style={{ color: "#000" }}>{y}年度</option>
        ))}
      </select>
      <ChevronDown size={14} color="#fff" style={{ position: "absolute", right: 6, pointerEvents: "none" }} />
    </div>
  );

  return (
    <>
      <MobileHeader title="請求書一覧" right={yearSelector} />
      <div style={{ padding: "16px" }}>
        {/* トースト */}
        {toast && (
          <div style={{
            position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
            background: "#16a34a", color: "#fff", padding: "8px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>{toast}</div>
        )}

        {/* 検索 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", borderRadius: 10, padding: "8px 12px",
          border: "1px solid var(--color-border)", marginBottom: 12,
        }}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="番号・顧客名で検索"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent" }}
          />
        </div>

        {/* フィルター */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: filter === f ? "none" : "1px solid var(--color-border)",
                background: filter === f ? "var(--color-primary)" : "#fff",
                color: filter === f ? "#fff" : "var(--color-text)",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}>
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* 一覧 */}
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 60 }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 60 }}>
            請求書がありません
          </div>
        ) : (
          filtered.map(inv => {
            const st = statusConfig[inv.status] ?? { label: inv.status, bg: "#f5f5f7", color: "#6e6e73" };
            return (
              <div key={inv.id} style={{
                background: "#fff", borderRadius: 12, padding: "14px 16px",
                marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{inv.invoice_number}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                    background: st.bg, color: st.color,
                  }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{getCustName(inv)}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{fmt(inv.total)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                  発行: {inv.issue_date} ｜ 期限: {inv.due_date}
                </div>
                {/* アクションボタン */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => setPreviewUrl(`/invoices/${inv.id}/receipt?embed=1`)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      border: "1px solid var(--color-border)", background: "#fff",
                      color: "var(--color-text-secondary)", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}
                  >
                    <Eye size={14} /> プレビュー
                  </button>
                  {inv.status === "sent" && (
                    <button
                      onClick={() => handleOpenMail(inv)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: "none", background: "var(--color-primary)",
                        color: "#fff", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}
                    >
                      <Mail size={14} /> メール送信
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* プレビューモーダル */}
      {previewUrl && (
        <MobilePreviewModal src={previewUrl} title="請求書プレビュー" onClose={() => setPreviewUrl(null)} />
      )}

      {/* メール送信モーダル */}
      {mailTarget && (
        <div
          onClick={() => setMailTarget(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: "16px 16px 0 0", width: "100%",
            maxHeight: "85vh", overflowY: "auto", padding: "20px 16px 32px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>請求書メール送信</span>
              <button onClick={() => setMailTarget(null)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              {mailTarget.invoice_number} ｜ {fmt(mailTarget.total)}
            </div>

            {error && (
              <div style={{ padding: "8px 12px", marginBottom: 12, borderRadius: 8, fontSize: 13, background: "#fef2f2", color: "#dc2626" }}>
                {error}
              </div>
            )}

            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>送信先</label>
            <input value={mailTo} onChange={e => setMailTo(e.target.value)}
              placeholder="メールアドレス"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--color-border)", fontSize: 14,
                marginBottom: 12, boxSizing: "border-box", outline: "none",
              }}
            />

            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>件名</label>
            <input value={mailSubject} onChange={e => setMailSubject(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--color-border)", fontSize: 14,
                marginBottom: 12, boxSizing: "border-box", outline: "none",
              }}
            />

            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>本文</label>
            <textarea value={mailBody} onChange={e => setMailBody(e.target.value)}
              rows={8}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--color-border)", fontSize: 13,
                marginBottom: 16, boxSizing: "border-box", outline: "none",
                resize: "vertical", lineHeight: 1.6,
              }}
            />

            <div style={{
              marginBottom: 16, padding: "12px 14px",
              background: "#f5f5f7", borderRadius: 8,
              border: "1px solid #e0e0e5",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "default", fontSize: 13, color: "var(--color-text-secondary)" }}>
                <input type="checkbox" disabled style={{ width: 16, height: 16 }} />
                カード決済リンクを添付する
              </label>
              <p style={{ margin: "4px 0 0 24px", fontSize: 11, color: "var(--color-text-secondary)" }}>
                Stripe連携後に利用可能になります
              </p>
            </div>

            <button
              onClick={handleSendMail}
              disabled={mailSending || !mailTo || !mailSubject || !mailBody}
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                border: "none", background: "var(--color-primary)", color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: (mailSending || !mailTo || !mailSubject || !mailBody) ? 0.5 : 1,
              }}
            >
              <Mail size={16} />
              {mailSending ? "送信中..." : "送信"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
