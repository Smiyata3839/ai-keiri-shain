"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Company = {
  name: string;
  invoice_registration_number: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  seal_image_url: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  tax_8: number;
  tax_10: number;
  subtotal: number;
  notes: string | null;
  status: string;
  customer_id: string;
  company_id: string;
};

type Customer = {
  name: string;
  email: string | null;
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
};

export default function ReceiptPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMailModal, setShowMailModal] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailSending, setMailSending] = useState(false);
  const [toast, setToast] = useState("");

  const receiptNumber = invoice ? invoice.invoice_number.replace("INV", "RCT") : "";
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: inv } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();
      if (!inv) { setError("請求書が見つかりません"); setLoading(false); return; }
      setInvoice(inv);

      const { data: comp } = await supabase
        .from("companies")
        .select("name, invoice_registration_number, postal_code, address, phone, email, seal_image_url")
        .eq("id", inv.company_id)
        .single();
      setCompany(comp);

      const { data: cust } = await supabase
        .from("customers")
        .select("name, email")
        .eq("id", inv.customer_id)
        .single();
      setCustomer(cust);

      const { data: itms } = await supabase
        .from("invoice_items")
        .select("description, quantity, unit_price, tax_rate, amount")
        .eq("invoice_id", inv.id)
        .order("created_at");
      setItems(itms ?? []);

      setLoading(false);
    };
    init();
  }, [params.id]);

  const handleOpenMail = () => {
    if (!invoice || !customer || !company) return;
    const sig = `\n\n──────────────────\n${company.name}${company.postal_code ? `\n〒${company.postal_code}` : ""}${company.address ? `\n${company.address}` : ""}${company.phone ? `\nTEL: ${company.phone}` : ""}${company.email ? `\n${company.email}` : ""}\n──────────────────`;
    setMailTo(customer.email ?? "");
    setMailSubject(`領収書送付のご案内（${receiptNumber}）`);
    setMailBody(`${customer.name} 様\n\nお世話になっております。\n\n下記の通り領収書を送付いたします。\nご査収のほどよろしくお願いいたします。\n\n領収書番号: ${receiptNumber}\n領収金額: ¥${invoice.total.toLocaleString()}（税込）\n対応請求書: ${invoice.invoice_number}\n\n何かご不明点がございましたらお気軽にお問い合わせください。${sig}`);
    setShowMailModal(true);
  };

  const handleSendMail = async () => {
    if (!invoice || !mailTo) return;
    setMailSending(true);
    setError("");
    try {
      const res = await fetch("/api/invoices/send-receipt-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          companyId: invoice.company_id,
          subject: mailSubject,
          body: mailBody,
          to: mailTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "送信に失敗しました"); setMailSending(false); return; }
      setShowMailModal(false);
      setToast("領収書メールを送信しました");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setError("メール送信中にエラーが発生しました");
    }
    setMailSending(false);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    if (invoice && customer) {
      document.title = `${receiptNumber}_${customer.name}_領収書`;
    }
    window.print();
    document.title = originalTitle;
  };

  const subtotal8 = items.filter((it) => it.tax_rate === 8).reduce((s, it) => s + it.amount, 0);
  const subtotal10 = items.filter((it) => it.tax_rate === 10).reduce((s, it) => s + it.amount, 0);

  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar-wrapper,
          .sidebar-fixed { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .print-area {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            min-height: auto !important;
          }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{
        padding: "16px 24px", borderBottom: "1px solid var(--color-border)",
        background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>領収書</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{receiptNumber}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => router.back()}
            style={{ ...btnStyle, border: "1px solid var(--color-border)", background: "white", color: "var(--color-text)" }}>
            戻る
          </button>
          <button onClick={handleOpenMail} disabled={!invoice}
            style={{ ...btnStyle, border: "1px solid #0077b6", background: "white", color: "#0077b6" }}>
            メールで送信
          </button>
          <button onClick={handlePrint} disabled={!invoice}
            style={{ ...btnStyle, border: "none", background: "var(--color-primary)", color: "white" }}>
            印刷 / PDF保存
          </button>
        </div>
      </div>

      <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
        {error && (
          <div style={{
            padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: "var(--radius-card)", color: "#dc2626", fontSize: "14px",
            width: "100%", maxWidth: "794px",
          }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "60px" }}>読み込み中...</div>
        ) : invoice && company && customer ? (
          <div className="print-area" style={{
            width: "794px", minHeight: "1123px", background: "white",
            borderRadius: "var(--radius-card)", boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
            padding: "48px", boxSizing: "border-box", fontSize: "13px", color: "var(--color-text)",
          }}>
            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: "700", letterSpacing: "8px" }}>領 収 書</h1>
            </div>

            {/* 宛先 + 右上に発行情報 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div style={{ display: "inline-block" }}>
                <div style={{ borderBottom: "2px solid var(--color-text)", paddingBottom: "6px", display: "inline-block" }}>
                  <span style={{ fontSize: "18px", fontWeight: "700" }}>{customer.name}</span>
                  <span style={{ fontSize: "13px", marginLeft: "8px" }}>様</span>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "12px", lineHeight: "2" }}>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>領収書番号: </span>
                  <span style={{ fontWeight: "600" }}>{receiptNumber}</span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>発行日: </span>
                  <span style={{ fontWeight: "600" }}>{today}</span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>対応請求書: </span>
                  <span style={{ fontWeight: "600" }}>{invoice.invoice_number}</span>
                </div>
              </div>
            </div>

            {/* 金額 */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>領収金額</div>
              <div style={{ display: "inline-block", borderBottom: "2px solid var(--color-text)", paddingBottom: "8px", paddingLeft: "24px", paddingRight: "24px" }}>
                <span style={{ fontSize: "28px", fontWeight: "700" }}>¥{invoice.total.toLocaleString()}-</span>
                <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginLeft: "8px" }}>(税込)</span>
              </div>
            </div>

            {/* 但し書き */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>但し</div>
              <div style={{ display: "inline-block", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px", paddingRight: "16px" }}>
                {items.map((it) => it.description).join("、")} として
              </div>
            </div>

            {/* 上記正に領収いたしました */}
            <div style={{ textAlign: "center", fontSize: "13px", marginBottom: "32px" }}>
              上記正に領収いたしました。
            </div>

            {/* 詳細・発行者 2カラム */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
              {/* 左: 内訳 */}
              <div style={{ width: "45%" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px" }}>内訳</div>
                <div style={{ ...rowStyle, borderBottom: `1px solid ${borderColor}` }}>
                  <span>小計</span>
                  <span>{invoice.subtotal.toLocaleString()}円</span>
                </div>
                {subtotal8 > 0 && (
                  <div style={{ ...rowStyle, borderBottom: `1px solid ${borderColor}` }}>
                    <span>消費税（8%）</span>
                    <span>{invoice.tax_8.toLocaleString()}円</span>
                  </div>
                )}
                {subtotal10 > 0 && (
                  <div style={{ ...rowStyle, borderBottom: `1px solid ${borderColor}` }}>
                    <span>消費税（10%）</span>
                    <span>{invoice.tax_10.toLocaleString()}円</span>
                  </div>
                )}
                <div style={{ ...rowStyle, fontWeight: "700", fontSize: "14px" }}>
                  <span>合計</span>
                  <span>{invoice.total.toLocaleString()}円</span>
                </div>
              </div>

              {/* 右: 発行者情報 */}
              <div style={{ width: "45%", textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px", textAlign: "left" }}>発行者</div>
                <div style={{ display: "inline-flex", alignItems: "flex-start", marginBottom: "6px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700" }}>{company.name}</span>
                  {company.seal_image_url && (
                    <div style={{
                      width: "72px", height: "72px", marginLeft: "-24px", marginTop: "-8px",
                      background: "white", flexShrink: 0, mixBlendMode: "multiply" as const, pointerEvents: "none" as const,
                    }}>
                      <img src={company.seal_image_url} alt="角印"
                        style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.85 }} />
                    </div>
                  )}
                </div>
                {company.invoice_registration_number && (
                  <div style={{ fontSize: "11px", marginBottom: "2px" }}>登録番号: {company.invoice_registration_number}</div>
                )}
                {company.postal_code && <div style={{ fontSize: "11px", marginBottom: "2px" }}>〒{company.postal_code}</div>}
                {company.address && <div style={{ fontSize: "11px", marginBottom: "2px" }}>{company.address}</div>}
                {company.phone && <div style={{ fontSize: "11px", marginBottom: "2px" }}>TEL: {company.phone}</div>}
                {company.email && <div style={{ fontSize: "11px", marginBottom: "2px" }}>{company.email}</div>}
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: "10px", color: "#999", marginTop: "24px" }}>
              本書を電子的に受領された場合、収入印紙の貼付は不要です
            </div>
          </div>
        ) : null}
      </div>

      {/* トースト */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 99999,
          padding: "12px 20px", borderRadius: "var(--radius-card)",
          background: "#1d1d1f", color: "white", fontSize: "14px", fontWeight: "600",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>{toast}</div>
      )}

      {/* メール送信モーダル */}
      {showMailModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { if (!mailSending) setShowMailModal(false); }}>
          <div style={{
            background: "white", borderRadius: "var(--radius-card)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)", width: "520px",
            maxHeight: "90vh", overflowY: "auto", padding: "28px",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--color-text)" }}>領収書メール送信</h3>
              <button onClick={() => setShowMailModal(false)} disabled={mailSending}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--color-text-secondary)" }}>×</button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>領収書番号</label>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text)" }}>{receiptNumber}</div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>宛先メールアドレス *</label>
              <input value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="customer@example.com" style={inputStyle} />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>件名 *</label>
              <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>本文 *</label>
              <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} rows={10}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }} />
            </div>

            <div style={{ marginBottom: "20px", padding: "10px 14px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac", fontSize: "12px", color: "#166534" }}>
              領収書PDFが自動的に添付されます
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setShowMailModal(false)} disabled={mailSending}
                style={{ ...btnStyle, border: "1px solid var(--color-border)", background: "white", color: "var(--color-text)" }}>
                キャンセル
              </button>
              <button onClick={handleSendMail}
                disabled={mailSending || !mailTo || !mailSubject || !mailBody}
                style={{
                  ...btnStyle, border: "none", background: "var(--color-primary)", color: "white",
                  opacity: (mailSending || !mailTo || !mailSubject || !mailBody) ? 0.6 : 1,
                  cursor: mailSending ? "not-allowed" : "pointer",
                }}>
                {mailSending ? "送信中..." : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 20px", borderRadius: "var(--radius-button)",
  fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "var(--font-sans)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)", marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--color-border)", borderRadius: "8px",
  fontSize: "14px", outline: "none", fontFamily: "var(--font-sans)",
  background: "white", boxSizing: "border-box",
};

const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px",
};

const borderColor = "#d2d2d7";
