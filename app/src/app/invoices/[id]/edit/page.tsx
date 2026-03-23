"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";

type Customer = { id: string; name: string; payment_terms: string | null };
type Company = { id: string; name: string; invoice_registration_number: string };
type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: 8 | 10;
  amount: number;
};

const emptyItem = (): InvoiceItem => ({
  description: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: 10,
  amount: 0,
});

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calculateDueDate(issueDate: string, paymentTerms: string | null): string {
  const terms = paymentTerms || "月末締め翌月末払い";
  const d = new Date(issueDate + "T00:00:00");
  if (isNaN(d.getTime())) return "";

  const netMatch = terms.match(/^Net(\d+)$/);
  if (netMatch) {
    const days = parseInt(netMatch[1], 10);
    const due = new Date(d);
    due.setDate(due.getDate() + days);
    return formatDate(due);
  }

  if (terms === "即時") return issueDate;
  if (terms === "月末締め翌月末払い") return formatDate(lastDayOfMonth(d.getFullYear(), d.getMonth() + 1));
  if (terms === "月末締め翌々月末払い") return formatDate(lastDayOfMonth(d.getFullYear(), d.getMonth() + 2));
  return formatDate(lastDayOfMonth(d.getFullYear(), d.getMonth() + 1));
}

export default function InvoiceEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // company
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name, invoice_registration_number")
        .eq("user_id", user.id)
        .single();
      if (comp) setCompany(comp);

      // customers
      if (comp) {
        const { data: custs } = await supabase
          .from("customers")
          .select("id, name, payment_terms")
          .eq("company_id", comp.id)
          .order("name");
        if (custs) setCustomers(custs);
      }

      // load invoice data
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .select("*, invoice_items(*), customers(*)")
        .eq("id", params.id)
        .single();

      if (invErr || !invoice) {
        setError("請求書が見つかりません");
        setLoadingData(false);
        return;
      }

      if (invoice.status !== "draft") {
        setError("作成中の請求書のみ編集できます");
        setLoadingData(false);
        return;
      }

      setCustomerId(invoice.customer_id);
      setInvoiceNumber(invoice.invoice_number);
      setIssueDate(invoice.issue_date);
      setDueDate(invoice.due_date);
      setNotes(invoice.notes ?? "");

      if (invoice.invoice_items && invoice.invoice_items.length > 0) {
        setItems(
          invoice.invoice_items.map((it: { description: string; quantity: number; unit_price: number; tax_rate: number; amount: number }) => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate as 8 | 10,
            amount: it.amount,
          }))
        );
      }

      setLoadingData(false);
    };
    init();
  }, [params.id]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    if (customer && issueDate) {
      setDueDate(calculateDueDate(issueDate, customer.payment_terms));
    }
  };

  const handleIssueDateChange = (date: string) => {
    setIssueDate(date);
    if (customerId && date) {
      const customer = customers.find((c) => c.id === customerId);
      setDueDate(calculateDueDate(date, customer?.payment_terms ?? null));
    }
  };

  const recalcItem = (item: InvoiceItem): InvoiceItem => ({
    ...item,
    amount: item.quantity * item.unit_price,
  });

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      next[index] = recalcItem(updated);
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const tax8 = Math.floor(items.filter((it) => it.tax_rate === 8).reduce((s, it) => s + it.amount, 0) * 0.08);
  const tax10 = Math.floor(items.filter((it) => it.tax_rate === 10).reduce((s, it) => s + it.amount, 0) * 0.1);
  const total = subtotal + tax8 + tax10;

  const handleSave = async (isPublish: boolean) => {
    setError("");
    if (!customerId) { setError("顧客を選択してください"); return; }
    if (!dueDate) { setError("支払期限を入力してください"); return; }
    if (items.some((it) => !it.description)) { setError("品目を入力してください"); return; }
    if (!company) { setError("自社情報が登録されていません"); return; }

    setSaving(true);
    try {
      // invoicesテーブルをUPDATE
      const { error: updErr } = await supabase.from("invoices").update({
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        tax_8: tax8,
        tax_10: tax10,
        total,
        notes,
        status: isPublish ? "sent" : "draft",
      }).eq("id", params.id);

      if (updErr) throw updErr;

      // 既存のinvoice_itemsを削除して再INSERT
      const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", params.id);
      if (delErr) throw delErr;

      const itemRows = items.map((it) => ({
        invoice_id: params.id,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        tax_rate: it.tax_rate,
        amount: it.amount,
      }));
      const { error: itemErr } = await supabase.from("invoice_items").insert(itemRows);
      if (itemErr) throw itemErr;

      // 発行時のみ自動仕訳を生成
      if (isPublish) {
        const customerName = customers.find((c) => c.id === customerId)?.name ?? "";
        const { error: journalErr } = await supabase.from("journals").insert({
          company_id: company.id,
          journal_date: issueDate,
          debit_account: "売掛金",
          credit_account: "売上高",
          amount: total,
          description: `${customerName} 売上 ${invoiceNumber}`,
          source: "auto",
        });
        if (journalErr) throw journalErr;
      }

      router.push("/invoices");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />

      {/* メインコンテンツ */}
      <div style={{ marginLeft: "260px", flex: 1, background: "var(--color-background)", minHeight: "100vh" }}>
        {/* ヘッダー */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--color-border)",
          background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>請求書編集</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>作成中の請求書を編集します</p>
        </div>

        {loadingData ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--color-text-secondary)" }}>読み込み中...</div>
        ) : (
          <div style={{ padding: "24px", maxWidth: "900px" }}>
            {error && (
              <div style={{
                padding: "12px 16px", marginBottom: "16px",
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "var(--radius-card)", color: "#dc2626", fontSize: "14px",
              }}>{error}</div>
            )}

            {/* 自社情報 */}
            {company && (
              <div style={{
                background: "var(--color-card)", borderRadius: "var(--radius-card)",
                padding: "20px 24px", marginBottom: "16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--color-text-secondary)", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                  適格請求書発行事業者
                </div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--color-text)" }}>{company.name}</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                  登録番号: {company.invoice_registration_number}
                </div>
              </div>
            )}

            {/* フォーム */}
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                {/* 顧客選択 */}
                <div>
                  <label style={labelStyle}>交付先（顧客）</label>
                  <select value={customerId} onChange={(e) => handleCustomerChange(e.target.value)} style={inputStyle}>
                    <option value="">選択してください</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {/* 請求書番号（readonly） */}
                <div>
                  <label style={labelStyle}>請求書番号</label>
                  <input value={invoiceNumber} readOnly style={{ ...inputStyle, background: "#f5f5f7", color: "var(--color-text-secondary)" }} />
                </div>
                {/* 発行日 */}
                <div>
                  <label style={labelStyle}>発行日（取引年月日）</label>
                  <input type="date" value={issueDate} onChange={(e) => handleIssueDateChange(e.target.value)} style={inputStyle} />
                </div>
                {/* 支払期限 */}
                <div>
                  <label style={labelStyle}>支払期限</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* 明細行 */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>取引内容（明細）</label>
                  <button onClick={addItem} style={addBtnStyle}>＋ 行追加</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                        <th style={thStyle}>品目</th>
                        <th style={{ ...thStyle, width: "80px" }}>数量</th>
                        <th style={{ ...thStyle, width: "120px" }}>単価</th>
                        <th style={{ ...thStyle, width: "100px" }}>税率</th>
                        <th style={{ ...thStyle, width: "120px", textAlign: "right" }}>金額</th>
                        <th style={{ ...thStyle, width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={tdStyle}>
                            <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                              placeholder="品目を入力" style={{ ...inputStyle, marginBottom: 0 }} />
                          </td>
                          <td style={tdStyle}>
                            <input type="number" value={item.quantity} min={1}
                              onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                              style={{ ...inputStyle, marginBottom: 0, textAlign: "right" }} />
                          </td>
                          <td style={tdStyle}>
                            <input type="number" value={item.unit_price || ""} min={0}
                              onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                              onBlur={(e) => { if (!e.target.value) updateItem(i, "unit_price", 0); }}
                              style={{ ...inputStyle, marginBottom: 0, textAlign: "right" }} />
                          </td>
                          <td style={tdStyle}>
                            <select value={item.tax_rate}
                              onChange={(e) => updateItem(i, "tax_rate", Number(e.target.value) as 8 | 10)}
                              style={{ ...inputStyle, marginBottom: 0 }}>
                              <option value={10}>10%</option>
                              <option value={8}>8%</option>
                            </select>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>
                            {item.amount.toLocaleString()}円
                          </td>
                          <td style={tdStyle}>
                            <button onClick={() => removeItem(i)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#dc2626", fontSize: "16px", padding: "4px",
                            }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 合計エリア */}
              <div style={{
                display: "flex", justifyContent: "flex-end",
              }}>
                <div style={{ width: "280px" }}>
                  <div style={summaryRow}>
                    <span>小計</span><span>{subtotal.toLocaleString()}円</span>
                  </div>
                  <div style={summaryRow}>
                    <span>消費税（8%）</span><span>{tax8.toLocaleString()}円</span>
                  </div>
                  <div style={summaryRow}>
                    <span>消費税（10%）</span><span>{tax10.toLocaleString()}円</span>
                  </div>
                  <div style={{
                    ...summaryRow,
                    borderTop: "2px solid var(--color-text)",
                    paddingTop: "8px", marginTop: "4px",
                    fontWeight: "700", fontSize: "16px",
                  }}>
                    <span>合計</span><span>{total.toLocaleString()}円</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 備考 */}
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <label style={labelStyle}>備考</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={3} placeholder="備考を入力（任意）"
                style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            {/* アクションボタン */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => router.push("/invoices")}
                style={{
                  padding: "10px 24px", borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)", background: "white",
                  color: "var(--color-text)", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                キャンセル
              </button>
              <button onClick={() => handleSave(false)} disabled={saving}
                style={{
                  padding: "10px 24px", borderRadius: "var(--radius-button)",
                  border: "none", background: "var(--color-primary)",
                  color: "white", fontSize: "14px", fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontFamily: "var(--font-sans)",
                }}>
                {saving ? "保存中..." : "保存する"}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                style={{
                  padding: "10px 24px", borderRadius: "var(--radius-button)",
                  border: "none", background: "#16a34a",
                  color: "white", fontSize: "14px", fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontFamily: "var(--font-sans)",
                }}>
                {saving ? "保存中..." : "発行する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Shared styles
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

const addBtnStyle: React.CSSProperties = {
  padding: "6px 14px", borderRadius: "var(--radius-button)",
  border: "1px solid var(--color-primary)", background: "transparent",
  color: "var(--color-primary)", fontSize: "13px", fontWeight: "600",
  cursor: "pointer", fontFamily: "var(--font-sans)",
};

const thStyle: React.CSSProperties = {
  padding: "8px 6px", textAlign: "left",
  fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 6px", verticalAlign: "middle",
};

const summaryRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  padding: "6px 0", fontSize: "14px", color: "var(--color-text)",
};
